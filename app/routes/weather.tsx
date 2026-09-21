import { useState, useEffect } from 'react';
import SunnyIcon from '../asserts/icons/animated/day.svg';
import CloudSun from '../asserts/icons/animated/cloudy-day-1.svg';
import CloudFog from '../asserts/icons/animated/cloudy-day-3.svg';
import CloudDrizzle from '../asserts/icons/animated/rainy-1.svg';
import CloudSlowRain from '../asserts/icons/animated/rainy-5.svg';
import CloudHeavyRain from '../asserts/icons/animated/rainy-7.svg';
import SlowSnowy from '../asserts/icons/animated/snowy-5.svg';
import HeavySnowy from '../asserts/icons/animated/snowy-6.svg';
import Thunder from '../asserts/icons/animated/thunder.svg';
import { fetchWithAuth, getAuthData } from '../utils/auth';

// Define the Farm interface matching your backend DTO
interface Farms {
  farmIDs: number;
  farmNames: string;
}

// getWeatherIcon function for choosing the weather icon according to the weather code
function getWeatherIcons(code: number | undefined) {
  const containerClass = "w-[100px] h-[100px]";

  if (code === undefined || code === null) {
    return (
      <div className={containerClass}>
        <img src={CloudSun} alt="N/A" className="w-full h-full object-contain opacity-40" />
      </div>
    );
  }

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
    case 51:
    case 53:
    case 55:
      return (
        <div className={containerClass}>
          <img src={CloudFog} alt="Cloudfog" className="w-full h-full object-contain" />
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

function getWeatherCondition(code: number | undefined) {
  if (code === undefined || code === null) {
    return <h2>N/A</h2>;
  }

  switch (code) {
    case 0:
      return (<h2>Clear Sky</h2>);
    case 1:
    case 2:
    case 3:
      return (<h2>Partly Cloudy</h2>);
    case 45:
    case 48:
      return (<h2>Foggy</h2>);
    case 51:
    case 53:
    case 55:
      return (<h2>Light Drizzle</h2>);
    case 56:
    case 57:
      return (<h2>Freezing Drizzle</h2>);
    case 61:
    case 63:
    case 65:
      return (<h2>Slightly Rainy</h2>);
    case 66:
    case 67:
      return (<h2>Freezing Rain</h2>);
    case 71:
    case 73:
    case 75:
    case 77:
      return (<h2>Snowy</h2>);
    case 80:
    case 81:
    case 82:
      return (<h2>Heavy Rain</h2>);
    case 85:
    case 86:
      return (<h2>Heavy Snow</h2>);
    case 95:
      return (<h2>Thunderstorm</h2>);
    case 96:
    case 99:
      return (<h2>Heavy Thunderstorm</h2>);
    default:
      return (<h2>Clear Sky</h2>);
  }
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
  status?: number;
}

// Helper safely extracting text/data or fallback to "N/A"
const val = (value: any, suffix: string = '') => {
  if (value === undefined || value === null || value === '') {
    return 'N/A';
  }
  return `${value}${suffix}`;
};

export default function WeatherPage() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Farm selection states (matching your crop page implementation)
  const [items, setItems] = useState<Farms[]>([]);
  const [selected, setSelected] = useState<string>('');

  // 1. Fetch available farms on component mount
  useEffect(() => {
    fetchWithAuth('/api/crops/farms')
      .then((res) => res.json())
      .then((data: unknown) => {
        const farmsList = data as Farms[];
        if (farmsList.length === 0) {
          setErrorMessage("No farms found.");
        } else {
          setItems(farmsList);
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage("Failed to load farms.");
      });
  }, []);

  // 2. Fetch weather details whenever a farm is selected
  useEffect(() => {
    if (!selected) {
      setWeather(null);
      return;
    }

    const loadWeather = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        // Adjust endpoint payload/path depending on how your backend expects the selected farm ID
        // Assuming your backend can take the farm ID (e.g., via query parameter or body). 
        // If your backend endpoint requires a POST body like crops, use:
        const response = await fetchWithAuth(
          `/api/weather/all`, // Change to your specific weather endpoint route if needed
          {
            method: "POST",
            body: JSON.stringify(Number(selected)),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as ApiErrorResponse;
          setErrorMessage(errorData.message || "Weather data is empty. Please configure your farm location.");
          setWeather(null);
        } else {
          setWeather(data);
        }
      } catch (err) {
        console.error("Failed to fetch weather data:", err);
        setErrorMessage("Location data is empty or server error occurred.");
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
  }, [selected]);

  return (
    <div className="bg-[#E8F5E9] flex flex-col gap-4 items-start rounded-2xl p-4 w-full">

      {/* Farm Selection Dropdown Section */}
      <div className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Select Farm for Weather</p>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full sm:w-64 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select a farm</option>
            {items.map((item) => (
              <option key={item.farmIDs} value={item.farmIDs}>
                {item.farmNames}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Show Backend Exception Message at top if it failed */}
      {errorMessage && (
        <div className="w-full bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl font-medium text-sm">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-6 font-semibold text-gray-700">Loading weather details...</div>
      )}

      {/* Weather Content - only displays if a farm is selected and not loading */}
      {!loading && selected && weather && (
        <>
          <div className='flex flex-wrap gap-4 w-full'>
            {/* current weather page part */}
            <div className="bg-[#E8F5E9] p-6 rounded-2xl border border-gray-100 flex-1">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Current Weather</h1>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md">
                <div className='flex gap-2'>
                  <h2 className='font-bold'>Current temperature : </h2>
                  <h2>{val(weather?.current?.temperature_2m)}</h2>
                  <h2>°C</h2>
                </div>
                <div className='flex gap-2'>
                  <h2 className='font-bold'>Weather Condition :</h2>
                  {getWeatherCondition(weather?.current?.weather_code)}
                </div>
                <div>{getWeatherIcons(weather?.current?.weather_code)}</div>
                <div className='flex gap-2'>
                  <h2 className='font-bold'>humidity: </h2>
                  <h2>{val(weather?.current?.relative_humidity_2m)}%</h2>
                </div>
                <div className='flex gap-2'>
                  <h2 className='font-bold'>Wind speed: </h2>
                  <h2>{val(weather?.current?.wind_speed_10m)}</h2>
                  <h2>km/h</h2>
                </div>
              </div>
            </div>

            {/* Additional data page part */}
            <div className="bg-[#E8F5E9] p-6 rounded-2xl border border-gray-100">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Additional Data</h1>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md">
                <h2 className='font-bold'>UV Index: </h2>
                <h2>{val(weather?.daily?.uv_index_max?.[0])}</h2>
                <h2 className='font-bold mt-2'>Expected Rainfall: </h2>
                <h2>{val(weather?.current?.rain)} mm</h2>
              </div>
            </div>
          </div>

          {/* weather forecast page part */}
          <div className="bg-[#E8F5E9] p-6 rounded-2xl border border-gray-100 w-full">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Daily Forecast</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 p-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
                  <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[index])}</h2>
                  <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[index])}</h2>
                  <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[index])}</h2>
                  <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[index])}
                  <div>{getWeatherIcons(weather?.daily?.weather_code?.[index])}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!selected && !loading && (
        <div className="w-full text-center py-12 text-gray-500 font-medium">
          Please select a farm from the dropdown above to view weather details.
        </div>
      )}

    </div>
  );
}