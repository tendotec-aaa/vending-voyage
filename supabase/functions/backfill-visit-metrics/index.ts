import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all visits ordered by spot and date
    const { data: visits, error: vErr } = await db
      .from("spot_visits")
      .select("id, spot_id, visit_date, created_at, days_since_last_visit, monthly_rent_per_spot, rent_since_last_visit")
      .order("visit_date", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(10000);

    if (vErr) throw new Error(`Fetch visits: ${vErr.message}`);
    if (!visits || visits.length === 0) {
      return new Response(JSON.stringify({ message: "No visits to backfill", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group visits by spot_id
    const bySpot: Record<string, typeof visits> = {};
    for (const v of visits) {
      if (!v.spot_id) continue;
      if (!bySpot[v.spot_id]) bySpot[v.spot_id] = [];
      bySpot[v.spot_id].push(v);
    }

    // Fetch all spots with location_id
    const spotIds = Object.keys(bySpot);
    const { data: spots } = await db
      .from("spots")
      .select("id, location_id")
      .in("id", spotIds);

    const spotLocationMap: Record<string, string> = {};
    for (const s of spots || []) {
      if (s.location_id) spotLocationMap[s.id] = s.location_id;
    }

    // Fetch all relevant locations
    const locationIds = [...new Set(Object.values(spotLocationMap))];
    const { data: locations } = await db
      .from("locations")
      .select("id, rent_amount")
      .in("id", locationIds);

    const locationRentMap: Record<string, number> = {};
    for (const l of locations || []) {
      locationRentMap[l.id] = l.rent_amount || 0;
    }

    // Count spots per location
    const { data: allSpots } = await db
      .from("spots")
      .select("id, location_id")
      .in("location_id", locationIds);

    const locationSpotCount: Record<string, number> = {};
    for (const s of allSpots || []) {
      if (s.location_id) {
        locationSpotCount[s.location_id] = (locationSpotCount[s.location_id] || 0) + 1;
      }
    }

    let updated = 0;
    let skipped = 0;

    for (const spotId of spotIds) {
      const spotVisits = bySpot[spotId]; // already sorted by visit_date asc, created_at asc

      const locationId = spotLocationMap[spotId];
      const totalRent = locationId ? (locationRentMap[locationId] || 0) : 0;
      const spotCount = locationId ? (locationSpotCount[locationId] || 1) : 1;
      const monthlyRentPerSpot = totalRent / spotCount;

      for (let i = 0; i < spotVisits.length; i++) {
        const v = spotVisits[i];

        // Skip if already populated
        if (v.days_since_last_visit !== null && v.monthly_rent_per_spot !== null && v.rent_since_last_visit !== null) {
          skipped++;
          continue;
        }

        let daysSinceLastVisit: number | null = null;
        let rentSinceLastVisit: number | null = null;

        if (i > 0) {
          const prev = spotVisits[i - 1];
          const prevDate = new Date(prev.visit_date);
          const currDate = new Date(v.visit_date);
          daysSinceLastVisit = Math.max(0, Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)));
          const dailyRent = monthlyRentPerSpot / 30;
          rentSinceLastVisit = Math.round(dailyRent * daysSinceLastVisit * 100) / 100;
        }

        const { error: uErr } = await db
          .from("spot_visits")
          .update({
            days_since_last_visit: daysSinceLastVisit,
            monthly_rent_per_spot: monthlyRentPerSpot,
            rent_since_last_visit: rentSinceLastVisit,
          })
          .eq("id", v.id);

        if (uErr) {
          console.error(`Failed to update visit ${v.id}:`, uErr.message);
        } else {
          updated++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, skipped, totalVisits: visits.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("backfill error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
