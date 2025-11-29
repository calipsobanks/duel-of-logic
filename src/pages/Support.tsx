import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Heart } from 'lucide-react';

const Support = () => {
  const navigate = useNavigate();

  const affiliateLinks = [
    {
      title: "Monitor Your Finances",
      service: "Monarch Money",
      description: "Track your spending and manage your money better",
      url: "https://www.monarchmoney.com/referral/f28nstm1ck?r_source=copy"
    },
    {
      title: "High Yield Savings Account",
      service: "SoFi",
      description: "Open a new high yield savings account and earn up to 4.50% APY for six months. Plus, enjoy no account fees, no minimums, and a cash bonus up to $300.",
      url: "https://www.sofi.com/invite/money?gcp=3ded8b36-0ea9-4507-a657-4d7bc89a674f&isAliasGcp=false"
    },
    {
      title: "Banking Made Easy",
      service: "Chime",
      description: "Use this link and get $100 when you open a Chime account",
      url: "https://www.chime.com/r/edwardhill830/?c=s"
    },
    {
      title: "Investment Platform",
      service: "Robinhood",
      description: "Sign up with this link and we'll both pick our own gift stock 🎁",
      url: "https://join.robinhood.com/edwardh173"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/discussions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gold">Support This App</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-8 space-y-6 max-w-2xl mx-auto">
        {/* Introduction Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-5 w-5 text-primary" />
              <CardTitle>Help Us Keep This Free</CardTitle>
            </div>
            <CardDescription>
              Running this app costs money due to AI usage and database hosting. Instead of charging users, 
              you can support us by using our affiliate links or making a donation. Every bit helps keep 
              this platform free for everyone!
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Affiliate Links Section */}
        <div className="space-y-4 pt-2">
          <div className="bg-primary/5 -mx-4 px-4 py-6 border-y border-primary/20">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-2 w-20 bg-primary rounded-full shadow-lg shadow-primary/30" />
                <h2 className="text-3xl font-bold tracking-tight">Support Through Affiliate Links</h2>
              </div>
              <p className="text-sm text-muted-foreground px-1">
                These are services we use and recommend. When you sign up through our links, we earn a small 
                commission at no extra cost to you:
              </p>
            </div>
          </div>
          
          {affiliateLinks.map((link, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{link.title}</CardTitle>
                <CardDescription className="text-xs font-semibold text-primary">
                  {link.service}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{link.description}</p>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => window.open(link.url, '_blank')}
                >
                  Open {link.service}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Financial Community Section */}
        <div className="space-y-4 pt-2">
          <div className="bg-secondary/5 -mx-4 px-4 py-6 border-y border-secondary/20">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-2 w-20 bg-secondary rounded-full shadow-lg shadow-secondary/30" />
                <h2 className="text-3xl font-bold tracking-tight">Join Our Financial Community</h2>
              </div>
              <p className="text-sm text-muted-foreground px-1">
                Want to learn more about financial education? Join our community where members earn $1,000 - $5,000:
              </p>
            </div>
          </div>
          
          <Card className="border-secondary/20">
            <CardHeader>
              <CardTitle>Earn Back Your Time Community</CardTitle>
              <CardDescription>
                A thriving community focused on financial education and earning opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Join our financing community where we discuss financial education strategies. 
                Members have the opportunity to earn between $1,000 - $5,000 while learning valuable 
                financial skills.
              </p>
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={() => window.open('https://www.skool.com/earn-back-your-time-1806/about?ref=d11ada6914ad4efbadf3be4b311fe2eb', '_blank')}
              >
                Join the Community
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Donation Section */}
        <div className="space-y-4 pt-2">
          <div className="bg-accent/5 -mx-4 px-4 py-6 border-y border-accent/20">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-2 w-20 bg-accent rounded-full shadow-lg shadow-accent/30" />
                <h2 className="text-3xl font-bold tracking-tight">Direct Support</h2>
              </div>
              <p className="text-sm text-muted-foreground px-1">
                Prefer to support us directly? You can make a one-time donation through PayPal:
              </p>
            </div>
          </div>
          
          <Card>
            <CardContent className="pt-6 flex justify-center">
              <form 
                action="https://www.paypal.com/ncp/payment/8YAZ5BXBB9D48" 
                method="post" 
                target="_blank" 
                style={{ display: 'inline-grid', justifyItems: 'center', alignContent: 'start', gap: '0.5rem' }}
              >
                <input 
                  type="submit" 
                  value="Buy Now" 
                  className="text-center border-none rounded min-w-[11.625rem] px-8 h-[2.625rem] font-bold bg-[#FFD140] text-black cursor-pointer hover:bg-[#FFD140]/90 transition-colors"
                  style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', fontSize: '1rem', lineHeight: '1.25rem' }}
                />
                <img 
                  src="https://www.paypalobjects.com/images/Debit_Credit_APM.svg" 
                  alt="cards" 
                  className="h-8"
                />
                <section className="text-xs text-muted-foreground flex items-center gap-1">
                  Powered by 
                  <img 
                    src="https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-wordmark-color.svg" 
                    alt="paypal" 
                    className="h-3.5"
                  />
                </section>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Thank You Message */}
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="pt-6 text-center">
            <Heart className="h-8 w-8 mx-auto mb-3 text-accent" />
            <p className="text-sm font-medium mb-1">Thank You for Your Support!</p>
            <p className="text-xs text-muted-foreground">
              Your contribution helps us maintain and improve this platform for everyone.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Support;
