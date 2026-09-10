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
      return (<h2>Party Cloudy</h2>);
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

function findUsername(): string | undefined {
  const authData = getAuthData();
  const username = authData?.username;
  return username;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchWithAuth(
          "/api/weather/all",
          {
            method: "GET"
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as ApiErrorResponse;
          setErrorMessage(errorData.message || "Location data is empty. Please configure your farm location.");
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
  }, []);

  if (loading) {
    return <div className="p-6 font-semibold text-gray-700">Loading...</div>;
  }

  return (
    // main page of the weather page
    <div className="bg-[#E8F5E9] flex flex-col gap-4 items-start rounded-2xl p-4 w-full">

      {/* Show Backend Exception Message at top if it failed */}
      {errorMessage && (
        <div className="w-full bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl font-medium text-sm">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className='flex flex-wrap gap-4'>
        {/* current weather page part */}
        <div className="bg-[#E8F5E9] p-6 rounded-2xl border border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Current Weather</h1>
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
          <h1 className="text-xl font-bold text-gray-900">Additional Data</h1>
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
        <h1 className="text-xl font-bold text-gray-900">Daily Forecast</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 p-4 gap-4">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[1])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[1])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[1])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[1])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[1])}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[2])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[2])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[2])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[2])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[2])}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[3])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[3])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[3])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[3])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[3])}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[4])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[4])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[4])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[4])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[4])}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[5])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[5])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[5])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[5])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[5])}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[6])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[6])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[6])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[6])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[6])}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[7])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[7])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[7])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[7])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[7])}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[8])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[8])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[8])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[8])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[8])}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[9])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[9])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[9])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[9])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[9])}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-2">
            <h2 className='font-bold'>Date :</h2><h2>{val(weather?.daily?.time?.[10])}</h2>
            <h2 className='font-bold'>High temperature :</h2><h2>{val(weather?.daily?.temperature_2m_max?.[10])}</h2>
            <h2 className='font-bold'>Low temperature :</h2><h2>{val(weather?.daily?.temperature_2m_min?.[10])}</h2>
            <h2 className='font-bold'>Weather Condition :</h2>{getWeatherCondition(weather?.daily?.weather_code?.[10])}
            <div>{getWeatherIcons(weather?.daily?.weather_code?.[10])}</div>
          </div>

        </div>
      </div>

    </div>
  );
}