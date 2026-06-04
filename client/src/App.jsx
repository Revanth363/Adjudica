import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ClaimForm from "./components/ClaimForm/ClaimForm";
import ManualReview from "./pages/ManualReview";
import AllClaims from "./pages/AllClaims";
import ClaimStatus from "./pages/ClaimStatus";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/submit" element={<ClaimForm />} />
        <Route path="/claims" element={<ManualReview />} />
        <Route path="/all-claims" element={<AllClaims />} />
        <Route path="/claims/:id" element={<ClaimStatus />} />
      </Routes>
    </BrowserRouter>
  );
}
