import {useState, useEffect} from 'react';
import {Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning} from 'lucide-react';

// getWeatherIcon function for choosing the weather icon according to the weather code
function getWeatherIcons(code: number) {
  const iconClass = "w-6 h-6"; // Standard size for all icons

  switch (code) {
    case 0:
      return <Sun className={`text-yellow-500 ${iconClass}`} />;
    case 1:
    case 2:
    case 3:
      return <CloudSun className={`text-gray-400 ${iconClass}`} />;
    case 45:
    case 48:
      return <CloudFog className={`text-gray-500 ${iconClass}`} />;
    case 51:
    case 53:
    case 55:
      return <CloudDrizzle className={`text-blue-400 ${iconClass}`} />;
    case 56:
    case 57:
      return <CloudDrizzle className={`text-blue-600 ${iconClass}`} />;
    case 61:
    case 63:
    case 65:
      return <CloudRain className={`text-blue-500 ${iconClass}`} />;
    case 66:
    case 67:
      return <CloudRain className={`text-blue-800 ${iconClass}`} />;
    case 71:
    case 73:
    case 75:
    case 77:
      return <CloudSnow className={`text-sky-300 ${iconClass}`} />;
    case 80:
    case 81:
    case 82:
      return <CloudRain className={`text-blue-600 ${iconClass}`} />;
    case 85:
    case 86:
      return <CloudSnow className={`text-sky-500 ${iconClass}`} />;
    case 95:
      return <CloudLightning className={`text-yellow-600 ${iconClass}`} />;
    case 96:
    case 99:
      return <CloudLightning className={`text-purple-600 ${iconClass}`} />;
    default:
      return <Cloud className={`text-gray-400 ${iconClass}`} />;
  }

}
// This is your static UI, no API involved yet!
export default function WeatherPage() {
  // Using hardcoded data to design the UI
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/weather/all")
      .then((res) => res.json())
      .then((data) => setWeather(data))
      .catch((err) => console.error(err));
    }, []);
  
  if (!weather) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-4 items-start">

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Current Weather</h1>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2>Current temperature </h2><h2>{weather.current.temperature_2m}</h2>
          <h2>Weather Condition</h2>
          <h2>{getWeatherIcons(weather.current.weather_code)}</h2>
          <h2>humidity</h2>
          <h2>Wind speed</h2>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Daily Forcast</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 p-4 gap-4">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
            <h2>Date</h2>
            <h2>High temperature</h2>
            <h2>Low temperature</h2>
            <h2>Weather Condition</h2>
            <h2>Rain Risk</h2>
          </div>

          
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Additional Data</h1>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2>UV Index</h2>
          <h2>Expected Rainfall</h2>
        </div>
      </div>


    </div>

    
  );
}