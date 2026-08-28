import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Widget } from '../components/Widget';
import { useWeatherStore } from '../stores/useWeatherStore';
import { useSettingsStore, formatTemperature } from '../stores/useSettingsStore';
import { getWeatherIcon } from '../utils/weatherCodes';
import type { WeatherData } from '../types';

// Leaflet loaded globally via CDN script tag in index.html
declare const L: typeof import('leaflet');

interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

/**
 * Combined Weather & Map Widget
 * Shows weather info as compact header with map below
 */
export const WeatherMap: React.FC = () => {
  const {
    city,
    coords,
    weatherData,
    loading,
    error,
    useGeolocation,
    setCity,
    setCoords,
    setWeatherData,
    setLoading,
    setError,
    setUseGeolocation,
  } = useWeatherStore();

  // Get temperature unit preference
  const temperatureUnit = useSettingsStore((state) => state.temperatureUnit);

  const [cityInput, setCityInput] = useState(city);
  const [showCityInput, setShowCityInput] = useState(!useGeolocation);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  // Fetch weather
  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation_probability&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
      );

      if (!response.ok) throw new Error('Weather API request failed');

      const data = await response.json();

      const weather: WeatherData = {
        location: city || '未知位置',
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        desc: getWeatherDescription(data.current.weather_code),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        precipProbability: data.current.precipitation_probability ?? 0,
        icon: getWeatherIcon(data.current.weather_code),
      };

      setWeatherData(weather);
      setLoading(false);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('获取天气数据失败');
      setLoading(false);
    }
  };

  // Fetch 5-day forecast
  const fetchForecast = useCallback(async () => {
    setForecastLoading(true);

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=auto`
      );
      if (!response.ok) throw new Error('Failed to fetch forecast');

      const data = await response.json();
      // Skip today (index 0), show next 5 days (indices 1-5)
      const days: ForecastDay[] = data.daily.time.slice(1, 6).map((date: string, i: number) => ({
        date,
        tempMax: Math.round(data.daily.temperature_2m_max[i + 1]),
        tempMin: Math.round(data.daily.temperature_2m_min[i + 1]),
        weatherCode: data.daily.weathercode[i + 1],
      }));

      setForecast(days);
    } catch (err) {
      console.error('Forecast fetch error:', err);
    } finally {
      setForecastLoading(false);
    }
  }, [coords.lat, coords.lng]);

  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      setError('浏览器不支持定位');
      setUseGeolocation(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCoords(newCoords);

        const cityName = await reverseGeocode(newCoords.lat, newCoords.lng);
        if (cityName) setCity(cityName);

        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('无法获取位置');
        setUseGeolocation(false);
        setShowCityInput(true);
        setLoading(false);
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
      );
      const data = await response.json();
      return data.address?.city || data.address?.town || data.address?.village || data.display_name;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  };

  const geocodeCity = async (cityName: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`
      );
      const data = await response.json();
      if (data.length === 0) return null;

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;

    setLoading(true);
    setError(null);

    const coords = await geocodeCity(cityInput.trim());
    if (!coords) {
      setError(`找不到“${cityInput}”`);
      setLoading(false);
      return;
    }

    setCity(cityInput.trim());
    setCoords(coords);
    setUseGeolocation(false);
    setShowCityInput(false);
  };

  // Initialize weather
  useEffect(() => {
    fetchWeather();
    // Only reverse geocode if we don't already have a city name
    if (!city) {
      reverseGeocode(coords.lat, coords.lng).then((cityName) => {
        if (cityName) setCity(cityName);
      });
    }

    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [coords.lat, coords.lng]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    if (typeof L === 'undefined') {
      console.error('Leaflet not loaded');
      return;
    }

    // Initialize map
    const map = L.map(mapRef.current).setView([coords.lat, coords.lng], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.marker([coords.lat, coords.lng])
      .addTo(map)
      .bindPopup(city || '你的位置')
      .openPopup();

    leafletMapRef.current = map;

    // Cleanup
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update map when coordinates change
  useEffect(() => {
    if (leafletMapRef.current) {
      if (typeof L !== 'undefined') {
        leafletMapRef.current.setView([coords.lat, coords.lng], 10);
        leafletMapRef.current.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            leafletMapRef.current?.removeLayer(layer);
          }
        });
        L.marker([coords.lat, coords.lng])
          .addTo(leafletMapRef.current)
          .bindPopup(city || '你的位置')
          .openPopup();
      }
    }
  }, [coords.lat, coords.lng, city]);

  // Auto-fetch forecast on mount and when coords change
  useEffect(() => {
    if (coords.lat && coords.lng) {
      fetchForecast();
    }
  }, [coords.lat, coords.lng, fetchForecast]);

  // Compact weather stats display for header
  const weatherStatsDisplay = (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      {/* Weather Stats */}
      {weatherData && !loading ? (
        <>
          {/* Weather icon and temp */}
          <div className="flex items-center gap-2">
            <div className="text-2xl">{weatherData.icon}</div>
            <div className="font-bold text-xl text-text-light-primary dark:text-text-dark-primary">
              {formatTemperature(weatherData.temp, temperatureUnit)}
            </div>
          </div>

          {/* Feels like */}
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            体感 {formatTemperature(weatherData.feelsLike, temperatureUnit, false)}
          </span>

          {/* Divider */}
          <div className="h-4 w-px bg-border-light dark:bg-border-dark"></div>

          {/* Additional stats */}
          <div className="flex gap-3 text-xs">
            <span className="text-text-light-secondary dark:text-text-dark-secondary" title="降水概率">
              🌧️ {weatherData.precipProbability}%
            </span>
            <span className="text-text-light-secondary dark:text-text-dark-secondary" title="湿度">
              💧 {weatherData.humidity}%
            </span>
            <span className="text-text-light-secondary dark:text-text-dark-secondary" title="风速">
              💨 {weatherData.windSpeed} mph
            </span>
          </div>

          {/* Location name */}
          <div className="h-4 w-px bg-border-light dark:bg-border-dark"></div>
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            📍 {city || '未知位置'}
          </span>
        </>
      ) : loading ? (
        <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">加载中…</div>
      ) : null}
    </div>
  );

  return (
    <Widget
      id="weathermap"
      title="天气与位置"
      headerAccessory={weatherStatsDisplay}
      draggable={false}
    >
      <div className="weathermap-widget flex flex-col lg:flex-row h-full">
        {/* Left: Map Section (auto-expands to fill remaining space) */}
        <div className="map-section flex-1 min-h-[320px] lg:min-h-[400px] p-2">
          <div className="map-container relative w-full h-full rounded-xl overflow-hidden">
            <div
              ref={mapRef}
              className="absolute inset-0 z-0"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />

            {/* Error message overlay - Centered on map */}
            {error && (
              <div className="absolute top-4 left-4 right-4 z-10 mx-auto max-w-md">
                <div className="p-4 bg-accent-red/10 dark:bg-accent-red/20 border-2 border-accent-red dark:border-accent-red rounded-lg shadow-xl text-sm text-accent-red dark:text-accent-red font-medium">
                  ⚠️ {error}
                </div>
              </div>
            )}

            {/* Location Controls - Overlay on map (top-left) */}
            {showCityInput ? (
              <div className="absolute top-4 left-4 z-10 flex gap-2 max-w-[280px]">
                <form onSubmit={handleCitySubmit} className="flex gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="输入城市…"
                    className="flex-1 min-w-0 px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary shadow-lg"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover shadow-lg"
                    disabled={loading}
                  >
                    {loading ? '...' : '前往'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCityInput(false);
                      getUserLocation();
                    }}
                    className="px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark shadow-lg"
                    title="使用我的位置"
                  >
                    📍
                  </button>
                </form>
              </div>
            ) : (
              <button
                onClick={() => setShowCityInput(true)}
                className="absolute top-4 left-4 z-10 px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark hover:text-accent-primary transition-colors rounded-lg shadow-lg border border-border-light dark:border-border-dark"
              >
                📍 {city || '设置位置'} ✏️
              </button>
            )}

            {/* GPS Location Button - Overlay on map (bottom-right) */}
            <button
              onClick={getUserLocation}
              disabled={loading}
              className="absolute bottom-4 right-4 z-10 p-3 bg-surface-light dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary rounded-full shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-border-light dark:border-border-dark hover:scale-110"
              title="使用我的当前位置"
            >
              <span className="text-2xl">📍</span>
            </button>
          </div>
        </div>

        {/* Right: 5-Day Forecast Section (auto-width based on content) */}
        <div className="forecast-section flex-shrink-0 min-h-[240px] lg:min-h-[400px] overflow-y-auto p-2">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 text-right">
            5天预报
          </h3>
          {forecastLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-text-light-secondary dark:text-text-dark-secondary">加载预报中…</p>
            </div>
          ) : forecast.length > 0 ? (
            <div className="space-y-3 flex flex-col items-start">
              {forecast.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center gap-3 p-2 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors w-64"
                >
                  <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary w-24">
                    {formatDate(day.date)}
                  </span>
                  <span className="text-2xl w-8 text-center">{getWeatherIcon(day.weatherCode)}</span>
                  <div className="text-sm flex-1">
                    <div className="font-semibold text-text-light-primary dark:text-text-dark-primary whitespace-nowrap text-right">
                      {formatTemperature(day.tempMax, temperatureUnit, false)} / {formatTemperature(day.tempMin, temperatureUnit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-text-light-secondary dark:text-text-dark-secondary">暂无预报数据</p>
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: '晴',
    1: '大部晴朗',
    2: '局部多云',
    3: '阴',
    45: '雾',
    48: '雾',
    51: '小毛毛雨',
    53: '毛毛雨',
    55: '大毛毛雨',
    61: '小雨',
    63: '雨',
    65: '大雨',
    71: '小雪',
    73: '雪',
    75: '大雪',
    77: '米雪',
    80: '阵雨',
    81: '阵雨',
    82: '强阵雨',
    85: '阵雪',
    86: '强阵雪',
    95: '雷暴',
    96: '雷暴',
    99: '强雷暴',
  };
  return descriptions[code] || '未知';
}
