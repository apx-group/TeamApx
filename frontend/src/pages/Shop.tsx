import '@/styles/game.css'

export default function Shop() {
  return (
    <div className="game-page">
      <div className="game-container">
        {/* Hero Section */}
        <section className="game-hero">
          <div className="game-hero-content">
            <h1 className="game-hero-title">
              <span className="accent">Shop</span>
            </h1>
            <p className="game-hero-subtitle">
              Exclusive Cosmetics & Items
            </p>
            <p className="game-hero-description">
              Browse and purchase exclusive items to customize your profile and showcase your style.
            </p>
          </div>
        </section>

        {/* Shop Section */}
        <section className="game-section">
          <div className="container">
            <h2 className="game-section-title">
              <span className="accent">Coming Soon</span>
            </h2>
            <p className="game-section-description">
              The shop is currently under development. Check back soon for exclusive items and cosmetics!
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
