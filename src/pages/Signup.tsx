import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

export default function Signup() {
  const { t } = useTranslation();
  const [firstNames, setFirstNames] = useState('');
  const [lastNames, setLastNames] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const signupSchema = z.object({
    firstNames: z.string().trim().min(2, { message: t('auth.nameMin') }).max(100),
    lastNames: z.string().trim().min(2, { message: t('auth.nameMin') }).max(100),
    email: z.string().trim().email({ message: t('auth.invalidEmail') }),
    password: z.string().min(6, { message: t('auth.passwordMin') }),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.passwordsDontMatch'),
    path: ["confirmPassword"],
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({ firstNames, lastNames, email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_names: firstNames.trim(),
          last_names: lastNames.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      toast({
        title: t('auth.signupFailed'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('auth.accountCreated'),
        description: t('auth.checkEmail'),
      });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{t('auth.createAccount')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth.enterDetails')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstNames">{t('auth.firstNames')}</Label>
                <Input id="firstNames" type="text" placeholder="Juan Carlos" value={firstNames} onChange={(e) => setFirstNames(e.target.value)} disabled={loading} autoComplete="given-name" />
                {errors.firstNames && <p className="text-sm text-destructive">{errors.firstNames}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastNames">{t('auth.lastNames')}</Label>
                <Input id="lastNames" type="text" placeholder="Pérez López" value={lastNames} onChange={(e) => setLastNames(e.target.value)} disabled={loading} autoComplete="family-name" />
                {errors.lastNames && <p className="text-sm text-destructive">{errors.lastNames}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" placeholder="tu@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoComplete="email" />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} autoComplete="new-password" />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} autoComplete="new-password" />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {t('auth.createAccount')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">{t('auth.signInLink')}</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
