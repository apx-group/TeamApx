import '@/styles/game.css'

export default function Game() {

  return (
    <div className="game-page">
      <div className="game-container">
        {/* Hero Section */}
        <section className="game-hero">
          <div className="game-hero-content">
            <h1 className="game-hero-title">
              TEAM<span className="accent">APX</span> GAME
            </h1>
            <p className="game-hero-subtitle">
              Compete, Rank, Dominate
            </p>
            <p className="game-hero-description">
              Welcome to the competitive hub. Track your progress, compete on the leaderboard, and earn exclusive items.
            </p>
            <div className="game-nav-buttons">
              <a href="#leaderboard" className="game-nav-btn">
                Leaderboard
              </a>
              <a href="#items" className="game-nav-btn">
                Items
              </a>
            </div>
          </div>
        </section>

        {/* Leaderboard Section */}
        <section className="game-section" id="leaderboard">
          <div className="container">
            <h2 className="game-section-title">
              <span className="accent">Leaderboard</span>
            </h2>
            <p className="game-section-description">
              Compete with other players and climb the ranks. Show your skills and claim your position at the top.
            </p>
            <a href="/leaderboard" className="game-nav-btn">
              View Leaderboard
            </a>
          </div>
        </section>

        {/* Items Section */}
        <section className="game-section" id="items">
          <div className="container">
            <h2 className="game-section-title">
              <span className="accent">Exclusive Items</span>
            </h2>
            <p className="game-section-description">
              Earn unique items and badges by completing challenges and achieving milestones. Showcase your achievements to the community.
            </p>
            <a href="/myitems" className="game-nav-btn">
              View My Items
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
