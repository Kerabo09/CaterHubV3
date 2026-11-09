import { Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, Guard } from './shared/AuthContext';
import { configured } from './shared/supabase';
import { Empty } from './shared/lib';
import { Header } from './shared/Header';
import { Home } from './public/Home';
import { List } from './public/CatererList';
import { Profile } from './public/CatererProfile';
import { Pkg } from './public/PackageDetail';
import { Signup } from './auth/Signup';
import { Login } from './auth/Login';
import { Inquire } from './customer/SendInquiry';
import { My } from './customer/MyInquiries';
import { Notes } from './customer/Notifications';
import Owner from './owner/OwnerLayout';
export default function App() {
  if (!configured)
    return (
      <Empty>
        Copy <b>.env.example</b> to <b>.env</b> and set your Supabase URL and anon key, then restart{' '}
        <b>npm run dev</b>.
      </Empty>
    );
  return (
    <AuthProvider>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/caterers" element={<List />} />
        <Route path="/caterer/:id" element={<Profile />} />
        <Route path="/package/:id" element={<Pkg />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/inquire/:id"
          element={
            <Guard role="Customer">
              <Inquire />
            </Guard>
          }
        />
        <Route
          path="/my"
          element={
            <Guard role="Customer">
              <My />
            </Guard>
          }
        />
        <Route
          path="/notes"
          element={
            <Guard role="Customer">
              <Notes />
            </Guard>
          }
        />
        <Route
          path="/owner"
          element={
            <Guard role="Caterer Owner">
              <Owner />
            </Guard>
          }
        />
        <Route
          path="/owner/:tab"
          element={
            <Guard role="Caterer Owner">
              <Owner />
            </Guard>
          }
        />
        <Route
          path="*"
          element={
            <Empty>
              Page not found. <Link to="/">Go home</Link>
            </Empty>
          }
        />
      </Routes>
      <footer className="foot">
        <b>CaterHub</b> · Discovery and inquiries only. Payments and contracts are arranged directly
        with the caterer.
      </footer>
    </AuthProvider>
  );
}
