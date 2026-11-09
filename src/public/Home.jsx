import { Link } from 'react-router-dom';
import { FilterForm } from './FilterForm';
import { EVENTS } from '../shared/lib';
export function Home() {
  return (
    <section className="wrap">
      <div className="hero">
        <span className="eyebrow">Calbayog catering directory</span>
        <h1>
          Find a caterer in <em>Calbayog</em>. Send an inquiry.
        </h1>
        <p>
          Browse caterers, compare packages and check dates. Payments and contracts are arranged
          directly with the caterer.
        </p>
        <div className="hero-cta">
          <Link className="btn lg" to="/caterers">
            Browse caterers
          </Link>
          <Link className="btn ghost lg" to="/signup">
            Create an account
          </Link>
        </div>
      </div>
      <FilterForm q={{}} className="card search">
        <button className="btn">Search</button>
      </FilterForm>
      <h2>How it works</h2>
      <div className="grid3">
        <div className="card">
          <h3>Browse and filter</h3>
          <p className="muted">
            Search by name, location, event type, guest count and budget. No account needed.
          </p>
        </div>
        <div className="card">
          <h3>Send an inquiry</h3>
          <p className="muted">
            Log in, choose a package or custom inquiry, and enter your event details.
          </p>
        </div>
        <div className="card">
          <h3>Track the reply</h3>
          <p className="muted">
            The caterer checks their calendar and replies. You see the status in your dashboard.
          </p>
        </div>
      </div>
      <h2>Browse by event type</h2>
      <div className="chips">
        {EVENTS.map((e) => (
          <Link key={e} className="chip" to={'/caterers?event=' + e}>
            {e}
          </Link>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 28 }}>
        CaterHub is for discovery and inquiries only. It does not process payments or confirm
        bookings.
      </p>
    </section>
  );
}
