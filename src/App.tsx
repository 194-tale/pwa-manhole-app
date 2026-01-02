import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import PrefectureList from './pages/PrefectureList';
import PrefectureDetail from './pages/PrefectureDetail';
import PhotoDetail from './pages/PhotoDetail';
import SettingsPage from './pages/Settings';
import Search from './pages/Search';
import Favorites from './pages/Favorites';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PrefectureList />} />
        <Route path="/prefecture/:id" element={<PrefectureDetail />} />
        <Route path="/photo/:id" element={<PhotoDetail />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/search" element={<Search />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
