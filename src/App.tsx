import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Team from "@/pages/Team";
import Explore from "@/pages/Explore";
import Relics from "@/pages/Relics";
import Museum from "@/pages/Museum";
import Market from "@/pages/Market";
import Ranking from "@/pages/Ranking";
import SecretRealm from "@/pages/SecretRealm";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/team" element={<Team />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/relics" element={<Relics />} />
          <Route path="/museum" element={<Museum />} />
          <Route path="/market" element={<Market />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/secret" element={<SecretRealm />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </Router>
  );
}
