// This is your static UI, no API involved yet!
export default function WeatherPage() {
  // Using hardcoded data to design the UI
  const mockData = { temperature: 28, condition: 'Sunny', humidity: 65 };

  return (
    <div className="flex flex-col gap-4 items-start">

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Current Weather</h1>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2>Current temperature</h2>
          <h2>Weather Condition</h2>
          <h2>icon</h2>
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