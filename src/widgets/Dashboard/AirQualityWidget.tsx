/**
 * Air Quality Widget
 * Current air quality index for your location
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BaseWidget } from './BaseWidget';

interface AirQuality {
  aqi: number;
  category: string;
  color: string;
  dominant: string;
  city: string;
}

export const AirQualityWidget: React.FC = () => {
  const [airQuality, setAirQuality] = useState<AirQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAQICategory = (aqi: number) => {
    if (aqi <= 50) return { category: '优', color: 'text-accent-green' };
    if (aqi <= 100) return { category: '良', color: 'text-accent-yellow' };
    if (aqi <= 150) return { category: '对敏感人群不健康', color: 'text-accent-orange' };
    if (aqi <= 200) return { category: '不健康', color: 'text-accent-red' };
    if (aqi <= 300) return { category: '非常不健康', color: 'text-accent-purple' };
    return { category: '危险', color: 'text-accent-red' };
  };

  const fetchAirQuality = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user's location first
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;

      // Using WAQI (World Air Quality Index) API - public token
      const response = await fetch(
        `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=demo`
      );
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      if (data.status !== 'ok') throw new Error('API error');

      const aqiInfo = getAQICategory(data.data.aqi);

      setAirQuality({
        aqi: data.data.aqi,
        category: aqiInfo.category,
        color: aqiInfo.color,
        dominant: data.data.dominentpol || 'N/A',
        city: data.data.city.name,
      });
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        setError('已拒绝位置权限');
      } else {
        setError('加载空气质量失败');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAirQuality();
  }, [fetchAirQuality]);

  return (
    <BaseWidget
      title="空气质量"
      icon="🌫️"
      loading={loading}
      error={error}
      onRefresh={fetchAirQuality}
    >
      {airQuality && (
        <div className="space-y-3">
          <div className="text-center">
            <div className={`text-4xl font-bold ${airQuality.color}`}>{airQuality.aqi}</div>
            <div className={`text-sm font-semibold ${airQuality.color} mt-1`}>
              {airQuality.category}
            </div>
            <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {airQuality.city}
            </div>
          </div>

          <div className="bg-surface-light-elevated dark:bg-surface-dark rounded-button p-2 transition-all duration-standard ease-smooth">
            <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              主要污染物
            </div>
            <div className="text-sm text-text-light-primary dark:text-text-dark-primary font-medium uppercase">
              {airQuality.dominant}
            </div>
          </div>

          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary space-y-1">
            <div className="flex justify-between">
              <span>0-50:</span>
              <span className="text-accent-green">优</span>
            </div>
            <div className="flex justify-between">
              <span>51-100:</span>
              <span className="text-accent-yellow">良</span>
            </div>
            <div className="flex justify-between">
              <span>101-150:</span>
              <span className="text-accent-orange">不健康（敏感人群）</span>
            </div>
            <div className="flex justify-between">
              <span>151+:</span>
              <span className="text-accent-red">不健康</span>
            </div>
          </div>
        </div>
      )}
    </BaseWidget>
  );
};
