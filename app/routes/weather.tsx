import {useState, useEffect} from 'react';
import SunnyIcon from '../asserts/icons/animated/day.svg';
import CloudSun from '../asserts/icons/animated/cloudy-day-1.svg';
import CloudFog from '../asserts/icons/animated/cloudy-day-3.svg';
import CloudDrizzle from '../asserts/icons/animated/rainy-1.svg';
import CloudSlowRain from '../asserts/icons/animated/rainy-5.svg';
import CloudHeavyRain from '../asserts/icons/animated/rainy-7.svg';
import SlowSnowy from '../asserts/icons/animated/snowy-5.svg';
import HeavySnowy from '../asserts/icons/animated/snowy-6.svg';
import Thunder from '../asserts/icons/animated/thunder.svg';

// getWeatherIcon function for choosing the weather icon according to the weather code
function getWeatherIcons(code: number) {
  const iconClass = "w-6 h-6";// Standard size for all icons
  const containerClass = "w-[100px] h-[100px]";

  switch (code) {
    case 0:
      return (
        <div className={containerClass}>
          <img src={SunnyIcon} alt="Sunny" className="w-full h-full object-contain" />
        </div>
      );
    case 1:
    case 2:
    case 3:
      return (
        <div className={containerClass}>
          <img src={CloudSun} alt="CloudySun" className="w-full h-full object-contain" />
        </div>
      );
    case 45:
    case 48:
      return  (  
        <div className={containerClass}>
          <img src={CloudFog} alt="Cloudfog" className="w-full h-full object-contain" />
        </div>
      );
    case 51:
    case 53:
    case 55:
      return (  
        <div className={containerClass}>
          <img src={CloudDrizzle} alt="Clouddrizzle" className="w-full h-full object-contain" />
        </div>
      );
    case 56:
    case 57:
      return (  
        <div className={containerClass}>
          <img src={CloudDrizzle} alt="Clouddrizzle" className="w-full h-full object-contain" />
        </div>
      );
    case 61:
    case 63:
    case 65:
      return (  
        <div className={containerClass}>
          <img src={CloudSlowRain} alt="Cloudrain" className="w-full h-full object-contain" />
        </div>
      );
    case 66:
    case 67:
      return (  
        <div className={containerClass}>
          <img src={CloudHeavyRain} alt="Cloudrain" className="w-full h-full object-contain" />
        </div>
      );
    case 71:
    case 73:
    case 75:
    case 77:
      return (  
        <div className={containerClass}>
          <img src={SlowSnowy} alt="Slowsnowy" className="w-full h-full object-contain" />
        </div>
      );
    case 80:
    case 81:
    case 82:
      return (  
        <div className={containerClass}>
          <img src={CloudHeavyRain} alt="Cloudrain" className="w-full h-full object-contain" />
        </div>
      );
    case 85:
    case 86:
      return (  
        <div className={containerClass}>
          <img src={HeavySnowy} alt="HeavySnow" className="w-full h-full object-contain" />
        </div>
      );
    case 95:
      return (  
        <div className={containerClass}>
          <img src={Thunder} alt="Thunder" className="w-full h-full object-contain" />
        </div>
      );
    case 96:
    case 99:
      return (  
        <div className={containerClass}>
          <img src={Thunder} alt="Thunder" className="w-full h-full object-contain" />
        </div>
      );
    default:
      return (
        <div className={containerClass}>
          <img src={CloudSun} alt="CloudySun" className="w-full h-full object-contain" />
        </div>
      );
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