import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock API for currency rates (simulating external API)
const mockCurrencyRates = {
  USD: 3.65,
  EUR: 3.95,
  GBP: 4.60,
  CHF: 4.10,
  CAD: 2.70,
  AUD: 2.40,
  JPY: 0.025,
  SEK: 0.35,
  NOK: 0.34,
  DKK: 0.54,
  TRY: 0.12,
  RUB: 0.037,
  CNY: 0.51,
  KRW: 0.0028,
  THB: 0.105,
  SGD: 2.75,
  HKD: 0.48,
  MXN: 0.19,
  BRL: 0.62,
  AED: 1.00,
  SAR: 0.98,
  EGP: 0.075,
  JOD: 5.20,
  KWD: 12.00,
  QAR: 1.01
};

export const currencyAPI = {
  // Get current rates from mock API
  async getCurrentRates() {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return mockCurrencyRates;
    } catch (error) {
      console.log('Error fetching rates:', error);
      return mockCurrencyRates; // Return mock data as fallback
    }
  },

  // Calculate buy/sell rates with commissions
  calculateRatesWithCommission(currentRate: number, buyCommission: number, sellCommission: number) {
    // Convert commission from agorot to shekel (100 agorot = 1 shekel)
    const buyCommissionShekel = buyCommission / 100;
    const sellCommissionShekel = sellCommission / 100;
    
    return {
      buy_rate: currentRate - buyCommissionShekel,
      sell_rate: currentRate + sellCommissionShekel
    };
  },

  // Update rates with database currencies and their commissions
  async updateRatesWithDatabaseCurrencies(currencies: any[]) {
    try {
      const currentRates = await this.getCurrentRates();
      
      const updatedRates = currencies.map(currency => {
        const currentRate = currentRates[currency.code as keyof typeof currentRates] || 0;
        const rates = this.calculateRatesWithCommission(
          currentRate,
          currency.buy_commission || 6,
          currency.sell_commission || 6
        );
        
        return {
          ...currency,
          current_rate: currentRate,
          buy_rate: rates.buy_rate,
          sell_rate: rates.sell_rate
        };
      });

      // Save updated rates to AsyncStorage
      await AsyncStorage.setItem('managedCurrencies', JSON.stringify(updatedRates));
      await AsyncStorage.setItem('lastRatesUpdate', new Date().toLocaleString('ar'));
      
      return {
        success: true,
        rates: updatedRates
      };
    } catch (error) {
      console.log('Error updating rates:', error);
      return {
        success: false,
        error: 'Failed to update rates'
      };
    }
  },

  // Auto update rates if needed (every hour)
  async autoUpdateIfNeeded() {
    try {
      const lastUpdate = await AsyncStorage.getItem('lastRatesUpdate');
      const now = new Date();
      
      if (!lastUpdate) {
        // First time, get currencies from storage and update
        const savedCurrencies = await AsyncStorage.getItem('managedCurrencies');
        const currencies = savedCurrencies ? JSON.parse(savedCurrencies) : [];
        return await this.updateRatesWithDatabaseCurrencies(currencies);
      }
      
      const lastUpdateTime = new Date(lastUpdate);
      const hoursSinceUpdate = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate >= 1) {
        // Update needed
        const savedCurrencies = await AsyncStorage.getItem('managedCurrencies');
        const currencies = savedCurrencies ? JSON.parse(savedCurrencies) : [];
        return await this.updateRatesWithDatabaseCurrencies(currencies);
      }
      
      // No update needed, return existing rates
      const savedCurrencies = await AsyncStorage.getItem('managedCurrencies');
      const currencies = savedCurrencies ? JSON.parse(savedCurrencies) : [];
      return currencies;
    } catch (error) {
      console.log('Error in auto update:', error);
      return [];
    }
  }
};