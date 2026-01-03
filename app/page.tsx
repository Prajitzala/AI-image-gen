'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Wand2, Zap, CheckCircle2, Star, TrendingUp, Users, Palette, Camera } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!config.supabaseEnabled) return;
    
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Styling',
      description: 'Advanced machine learning algorithms analyze your wardrobe and create perfect outfit combinations tailored to your personal style.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Camera,
      title: 'Virtual Try-On',
      description: 'See how your clothes look together before you buy. Upload images and visualize your outfits instantly with photorealistic rendering.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Palette,
      title: 'Style Recommendations',
      description: 'Get personalized style suggestions based on current trends, weather, and your unique fashion preferences.',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: Wand2,
      title: 'Smart Mix & Match',
      description: 'Automatically discover new outfit combinations from your existing wardrobe. Never wear the same outfit twice.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: TrendingUp,
      title: 'Trend Analysis',
      description: 'Stay ahead of fashion trends with AI-powered insights and recommendations based on global fashion data.',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Generate outfit combinations in seconds. No waiting, no delays. Get instant results with our optimized AI engine.',
      gradient: 'from-yellow-500 to-orange-500',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Active Users', icon: Users },
    { value: '50K+', label: 'Outfits Generated', icon: Sparkles },
    { value: '4.9', label: 'User Rating', icon: Star },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200/50 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-chango">
              AI Outfit Generator
            </div>
            <div className="flex items-center gap-4">
              {config.supabaseEnabled && (
                <>
                  {user ? (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-700 hidden md:block">{user.email}</span>
                      <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="text-sm text-gray-600 hover:text-black"
                      >
                        Sign Out
                      </Button>
                      <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                        <Link href="/app" className="flex items-center gap-2">
                          Try It Now
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                      <Link href="/app" className="flex items-center gap-2">
                        Try It Now
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  )}
                </>
              )}
              {!config.supabaseEnabled && (
                <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                  <Link href="/app" className="flex items-center gap-2">
                    Try It Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 via-pink-100/20 to-blue-100/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        
        <div className={`max-w-7xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-8 animate-pulse">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Powered by Advanced AI</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent leading-tight animate-gradient">
            Create Stunning
            <br />
            <span className="font-chango">Outfit Combinations</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform your wardrobe with AI-powered virtual try-on technology. 
            Upload your clothing items and discover perfect outfit combinations in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button 
              asChild 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Link href="/app" className="flex items-center gap-2">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6 rounded-full border-2 hover:bg-gray-50 transition-all duration-300"
            >
              <Link href="#features">Learn More</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className={`bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <stat.icon className="w-8 h-8 text-purple-600 mb-3 mx-auto" />
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to revolutionize your wardrobe and style
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`group relative overflow-hidden border-2 hover:border-transparent transition-all duration-500 hover:shadow-2xl ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                <div className="relative p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Style?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already creating stunning outfits with AI
          </p>
          <Button 
            asChild 
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 font-semibold"
          >
            <Link href="/app" className="flex items-center gap-2">
              Start Creating Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
