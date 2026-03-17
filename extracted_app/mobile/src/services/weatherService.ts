/**
 * Weather Service
 * Integrates with OpenWeatherMap API for weather-aware reminders
 */

interface WeatherCondition {
  temp: number;
  feelsLike: number;
  condition: string; // "clear", "rain", "snow", "clouds", etc.
  description: string;
  humidity: number;
  windSpeed: number;
}

interface WeatherResponse {
  weather: Array<{
    main: string;
    description: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
}

export class WeatherService {
  private static API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || "";
  private static BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

  /**
   * Get current weather for a location
   */
  static async getCurrentWeather(
    latitude: number,
    longitude: number
  ): Promise<WeatherCondition | null> {
    try {
      if (!this.API_KEY) {
        console.log("ℹ️ Weather API key not configured");
        return null;
      }

      const url = `${this.BASE_URL}?lat=${latitude}&lon=${longitude}&appid=${this.API_KEY}&units=imperial`;

      const response = await fetch(url);

      if (!response.ok) {
        console.log(`Weather API error: ${response.status}`);
        return null;
      }

      const data: WeatherResponse = await response.json();

      return {
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        condition: data.weather[0]?.main.toLowerCase() || "unknown",
        description: data.weather[0]?.description || "Unknown",
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed),
      };
    } catch (error) {
      console.log("Could not fetch weather:", error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Check if current weather matches specified conditions
   */
  static async checkWeatherConditions(
    latitude: number,
    longitude: number,
    conditions: {
      allowedConditions?: string[]; // e.g., ["clear", "clouds"]
      minTemp?: number;
      maxTemp?: number;
      maxWindSpeed?: number;
    }
  ): Promise<boolean> {
    const weather = await this.getCurrentWeather(latitude, longitude);

    if (!weather) {
      // If we can't get weather, allow the reminder (fail-open)
      return true;
    }

    // Check condition type (sunny, rainy, etc.)
    if (conditions.allowedConditions && conditions.allowedConditions.length > 0) {
      if (!conditions.allowedConditions.includes(weather.condition)) {
        return false;
      }
    }

    // Check temperature range
    if (conditions.minTemp !== undefined && weather.temp < conditions.minTemp) {
      return false;
    }

    if (conditions.maxTemp !== undefined && weather.temp > conditions.maxTemp) {
      return false;
    }

    // Check wind speed
    if (conditions.maxWindSpeed !== undefined && weather.windSpeed > conditions.maxWindSpeed) {
      return false;
    }

    return true;
  }

  /**
   * Get weather emoji for display
   */
  static getWeatherEmoji(condition: string): string {
    const emojiMap: { [key: string]: string } = {
      clear: "☀️",
      clouds: "☁️",
      rain: "🌧️",
      drizzle: "🌦️",
      thunderstorm: "⛈️",
      snow: "❄️",
      mist: "🌫️",
      fog: "🌫️",
      haze: "🌫️",
    };

    return emojiMap[condition.toLowerCase()] || "🌤️";
  }

  /**
   * Get user-friendly weather description
   */
  static getWeatherDescription(weather: WeatherCondition): string {
    const emoji = this.getWeatherEmoji(weather.condition);
    return `${emoji} ${weather.temp}°F - ${weather.description}`;
  }

  /**
   * Check if weather is suitable for outdoor activities
   */
  static isSuitableForOutdoorActivity(weather: WeatherCondition): boolean {
    // Not suitable if raining, snowing, or extreme temps
    if (["rain", "snow", "thunderstorm"].includes(weather.condition)) {
      return false;
    }

    // Too cold or too hot
    if (weather.temp < 40 || weather.temp > 95) {
      return false;
    }

    // Too windy
    if (weather.windSpeed > 25) {
      return false;
    }

    return true;
  }
}
