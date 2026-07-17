// This is your static UI, no API involved yet!
export default function WeatherPage() {
  // Using hardcoded data to design the UI
  const mockData = { temperature: 28, condition: 'Sunny', humidity: 65 };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h1 className="text-xl font-bold text-gray-900">Current Weather</h1>
      <p className="text-2xl">{mockData.temperature}°C</p>
      <p className="text-gray-500">{mockData.condition}</p>
    </div>
  );
}