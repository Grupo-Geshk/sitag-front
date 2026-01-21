import { useNavigate } from 'react-router-dom';

export default function WelcomePage() {
  const navigate = useNavigate();

  // Placeholder partner logos - replace with actual company/farm logos
  const partners = [
    { name: 'Finca El Progreso', color: '#79cc94' },
    { name: 'Ganadera San José', color: '#5a8f6f' },
    { name: 'Hacienda Los Ángeles', color: '#8b9d83' },
    { name: 'Rancho Verde', color: '#68b582' },
    { name: 'Ganadería La Esperanza', color: '#6fb88a' },
    { name: 'Finca Santa Elena', color: '#7aa88e' },
    { name: 'Agropecuaria Del Valle', color: '#85c99d' },
    { name: 'Hacienda El Roble', color: '#93b89f' }
  ];

  // Duplicate array for seamless loop
  const duplicatedPartners = [...partners, ...partners];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="w-full py-2 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-md font-bold text-center tracking-tight" style={{ color: '#2d3748' }}>
            SITAG
          </h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center space-y-6">
          {/* Announcement Pill */}
          <div className="flex justify-center mb-2">
            <a
              href="https://grupogeshk.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200"
              style={{
                backgroundColor: '#f7fafc',
                borderColor: '#e2e8f0',
                color: '#4a5568'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#edf2f7';
                e.currentTarget.style.borderColor = '#cbd5e0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f7fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              Sé parte del acceso anticipado →
            </a>
          </div>

          {/* Main Headline */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold">
            <span style={{ color: '#1a202c' }}>Administre su finca</span>
            <br />
            <span style={{ color: '#79cc94' }}>Entienda su operación.</span>
          </h2>

          {/* Subtitle */}
          <p className="text-base md:text-lg max-w-2xl mx-auto leading-snug font-medium" style={{ color: '#4a5568' }}>
            SITAG es una plataforma web que permite a ganaderos gestionar todos los procesos de tu finca.
          </p>

          {/* Primary CTA */}
          <div className="pt-2">
            <button
              onClick={() => navigate('/login')}
              className="inline-block text-white px-8 py-3 text-base font-semibold transition-all duration-200 rounded-lg"
              style={{ backgroundColor: '#68b582' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#79cc94'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#68b582'}
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          {/* Auto-scrolling Carousel */}
          <div className="relative overflow-hidden">
            <div className="flex gap-12 animate-scroll">
              {duplicatedPartners.map((partner, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-48 h-24 flex items-center justify-center bg-white border border-gray-150"
                >
                  {/* Placeholder logo - replace with actual images */}
                  <div className="text-center px-4">
                    <div
                      className="w-12 h-12 mx-auto mb-2 rounded"
                      style={{ backgroundColor: partner.color }}
                    ></div>
                    <p className="text-xs font-medium leading-tight" style={{ color: '#4a5568' }}>
                      {partner.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Explanatory Text */}
          <p className="text-center mt-12 max-w-2xl mx-auto" style={{ color: '#718096' }}>
            Fincas y empresas ganaderas que fortalecen su operación con SITAG
          </p>
        </div>
      </section>

      {/* Inline Keyframes for Carousel Animation */}
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 40s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
