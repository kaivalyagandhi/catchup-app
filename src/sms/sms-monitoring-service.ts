/**
 * SMS/MMS Monitoring Service
 *
 * Tracks metrics, performance, and costs for SMS/MMS enrichment processing.
 * Provides monitoring data for dashboards and alerting.
 *
 * Requirements: 9.1 - Comprehensive error logging and monitoring
 */

import pool from '../db/connection';

/**
 * Message processing metrics
 */
export interface MessageMetrics {
  messagesReceived: number;
  messagesProcessed: number;
  messagesFailed: number;
  averageProcessingTime: number;
  errorRate: number;
  byType: {
    sms: number;
    mms: number;
  };
  byContentType: {
    text: number;
    audio: number;
    image: number;
    video: number;
  };
}

/**
 * AI API performance metrics
 */
export interface AIPerformanceMetrics {
  totalCalls: number;
  averageLatency: number;
  errorCount: number;
  errorRate: number;
  byService: {
    gemini: {
      calls: number;
      averageLatency: number;
      errors: number;
    };
    speechToText: {
      calls: number;
      averageLatency: number;
      errors: number;
    };
  };
}

/**
 * Cost tracking metrics
 */
export interface CostMetrics {
  twilio: {
    smsCount: number;
    mmsCount: number;
    estimatedCost: number;
  };
  googleCloud: {
    geminiCalls: number;
    speechToTextMinutes: number;
    estimatedCost: number;
  };
  totalEstimatedCost: number;
}

/**
 * Usage statistics for dashboard
 */
export interface UsageStatistics {
  period: string;
  messageMetrics: MessageMetrics;
  aiPerformance: AIPerformanceMetrics;
  costs: CostMetrics;
  topUsers: Array<{
    userId: string;
    messageCount: number;
    enrichmentCount: number;
  }>;
  errorBreakdown: Array<{
    errorType: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  errorRateThreshold: number; // Percentage (e.g., 5 for 5%)
  highLatencyThreshold: number; // Milliseconds
  costThreshold: number; // Dollars per day
}

/**
 * Alert event
 */
export interface AlertEvent {
  type: 'error_rate' | 'high_latency' | 'cost_threshold' | 'rate_limit_spike';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

/**
 * SMS/MMS Monitoring Service
 */
export class SMSMonitoringService {
  private metrics: Map<string, any>;
  private alertConfig: AlertConfig;
  private alerts: AlertEvent[];

  constructor(alertConfig?: Partial<AlertConfig>) {
    this.metrics = new Map();
    this.alertConfig = {
      errorRateThreshold: alertConfig?.errorRateThreshold || 5, // 5%
      highLatencyThreshold: alertConfig?.highLatencyThreshold || 30000, // 30 seconds
      costThreshold: alertConfig?.costThreshold || 50, // $50/day
    };
    this.alerts = [];
  }

  /**
   * Track a message received
   *
   * @param messageType - SMS or MMS
   * @param contentType - text, audio, image, or video
   */
  trackMessageReceived(messageType: 'sms' | 'mms', contentType: string): void {
    const key = `messages_received_${messageType}_${contentType}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);

    console.log(`[Monitoring] Message received: ${messageType}/${contentType}`);
  }

  /**
   * Track message processing completion
   *
   * @param messageType - SMS or MMS
   * @param contentType - text, audio, image, or video
   * @param processingTime - Time in milliseconds
   * @param success - Whether processing succeeded
   */
  trackMessageProcessed(
    messageType: 'sms' | 'mms',
    contentType: string,
    processingTime: number,
    success: boolean
  ): void {
    if (success) {
      const key = `messages_processed_${messageType}_${contentType}`;
      const current = this.metrics.get(key) || 0;
      this.metrics.set(key, current + 1);
    } else {
      const key = `messages_failed_${messageType}_${contentType}`;
      const current = this.metrics.get(key) || 0;
      this.metrics.set(key, current + 1);
    }

    // Track processing time
    const timeKey = `processing_time_${messageType}_${contentType}`;
    const times = this.metrics.get(timeKey) || [];
    times.push(processingTime);
    this.metrics.set(timeKey, times);

    // Check for high latency alert
    if (processingTime > this.alertConfig.highLatencyThreshold) {
      this.triggerAlert({
        type: 'high_latency',
        severity: 'warning',
        message: `High processing latency detected: ${processingTime}ms for ${messageType}/${contentType}`,
        value: processingTime,
        threshold: this.alertConfig.highLatencyThreshold,
        timestamp: new Date(),
      });
    }

    console.log(
      `[Monitoring] Message processed: ${messageType}/${contentType}, ` +
        `time: ${processingTime}ms, success: ${success}`
    );
  }

  /**
   * Track AI API call
   *
   * @param service - gemini or speechToText
   * @param latency - Time in milliseconds
   * @param success - Whether call succeeded
   */
  trackAICall(service: 'gemini' | 'speechToText', latency: number, success: boolean): void {
    const key = `ai_${service}_calls`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);

    const latencyKey = `ai_${service}_latency`;
    const latencies = this.metrics.get(latencyKey) || [];
    latencies.push(latency);
    this.metrics.set(latencyKey, latencies);

    if (!success) {
      const errorKey = `ai_${service}_errors`;
      const errors = this.metrics.get(errorKey) || 0;
      this.metrics.set(errorKey, errors + 1);
    }

    console.log(`[Monitoring] AI call: ${service}, latency: ${latency}ms, success: ${success}`);
  }

  /**
   * Track error occurrence
   *
   * @param errorType - Type of error
   * @param errorMessage - Error message
   * @param context - Additional context
   */
  trackError(errorType: string, errorMessage: string, context?: Record<string, any>): void {
    const key = `error_${errorType}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);

    console.error(`[Monitoring] Error tracked: ${errorType} - ${errorMessage}`, context);

    // Check error rate
    this.checkErrorRate();
  }

  /**
   * Track cost for Twilio usage
   *
   * @param messageType - SMS or MMS
   */
  trackTwilioCost(messageType: 'sms' | 'mms'): void {
    const key = `cost_twilio_${messageType}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);

    // Estimate cost (approximate US rates)
    const smsCost = 0.0079; // $0.0079 per SMS
    const mmsCost = 0.02; // $0.02 per MMS

    const costKey = 'cost_twilio_total';
    const currentCost = this.metrics.get(costKey) || 0;
    const additionalCost = messageType === 'sms' ? smsCost : mmsCost;
    this.metrics.set(costKey, currentCost + additionalCost);

    console.log(`[Monitoring] Twilio cost tracked: ${messageType}, +$${additionalCost.toFixed(4)}`);
  }

  /**
   * Track cost for Google Cloud AI usage
   *
   * @param service - gemini or speechToText
   * @param units - Number of units (calls for Gemini, minutes for Speech-to-Text)
   */
  trackGoogleCloudCost(service: 'gemini' | 'speechToText', units: number): void {
    const key = `cost_google_${service}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + units);

    // Estimate cost (approximate rates)
    const geminiCostPerCall = 0.00067; // ~$0.00067 per call (varies by model)
    const speechToTextCostPerMinute = 0.006; // $0.006 per minute

    const costKey = 'cost_google_total';
    const currentCost = this.metrics.get(costKey) || 0;
    const additionalCost =
      service === 'gemini' ? units * geminiCostPerCall : units * speechToTextCostPerMinute;
    this.metrics.set(costKey, currentCost + additionalCost);

    console.log(
      `[Monitoring] Google Cloud cost tracked: ${service}, ` +
        `${units} units, +$${additionalCost.toFixed(4)}`
    );
  }

  /**
   * Track rate limit event
   *
   * @param phoneNumber - Phone number that hit rate limit
   */
  trackRateLimit(phoneNumber: string): void {
    const key = 'rate_limits_hit';
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);

    // Check for rate limit spike
    if (current > 10) {
      // More than 10 rate limits in current period
      this.triggerAlert({
        type: 'rate_limit_spike',
        severity: 'warning',
        message: `Rate limit spike detected: ${current} rate limits hit`,
        value: current,
        threshold: 10,
        timestamp: new Date(),
      });
    }

    console.log(`[Monitoring] Rate limit hit: ${phoneNumber}`);
  }

  /**
   * Get message metrics for a time period
   *
   * @param startDate - Start of period
   * @param endDate - End of period
   * @returns Message metrics
   */
  async getMessageMetrics(startDate: Date, endDate: Date): Promise<MessageMetrics> {
    const client = await pool.connect();

    try {
      // Get message counts from enrichment_items table
      const result = await client.query(
        `
        SELECT 
          source,
          source_metadata->>'mediaType' as media_type,
          COUNT(*) as count
        FROM enrichment_items
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY source, media_type
        `,
        [startDate, endDate]
      );

      let smsCount = 0;
      let mmsCount = 0;
      let textCount = 0;
      let audioCount = 0;
      let imageCount = 0;
      let videoCount = 0;

      for (const row of result.rows) {
        const count = parseInt(row.count, 10);

        if (row.source === 'sms') {
          smsCount += count;
          textCount += count;
        } else if (row.source === 'mms') {
          mmsCount += count;

          if (row.media_type?.startsWith('audio/')) {
            audioCount += count;
          } else if (row.media_type?.startsWith('image/')) {
            imageCount += count;
          } else if (row.media_type?.startsWith('video/')) {
            videoCount += count;
          }
        }
      }

      const totalMessages = smsCount + mmsCount;

      return {
        messagesReceived: totalMessages,
        messagesProcessed: totalMessages, // Assume all stored messages were processed
        messagesFailed: 0, // Would need separate error tracking table
        averageProcessingTime: 0, // Would need separate timing table
        errorRate: 0,
        byType: {
          sms: smsCount,
          mms: mmsCount,
        },
        byContentType: {
          text: textCount,
          audio: audioCount,
          image: imageCount,
          video: videoCount,
        },
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get AI performance metrics
   *
   * @returns AI performance metrics
   */
  getAIPerformanceMetrics(): AIPerformanceMetrics {
    const geminiCalls = this.metrics.get('ai_gemini_calls') || 0;
    const geminiLatencies = this.metrics.get('ai_gemini_latency') || [];
    const geminiErrors = this.metrics.get('ai_gemini_errors') || 0;

    const speechCalls = this.metrics.get('ai_speechToText_calls') || 0;
    const speechLatencies = this.metrics.get('ai_speechToText_latency') || [];
    const speechErrors = this.metrics.get('ai_speechToText_errors') || 0;

    const totalCalls = geminiCalls + speechCalls;
    const totalErrors = geminiErrors + speechErrors;

    const avgGeminiLatency =
      geminiLatencies.length > 0
        ? geminiLatencies.reduce((a: number, b: number) => a + b, 0) / geminiLatencies.length
        : 0;

    const avgSpeechLatency =
      speechLatencies.length > 0
        ? speechLatencies.reduce((a: number, b: number) => a + b, 0) / speechLatencies.length
        : 0;

    const avgLatency =
      totalCalls > 0 ? (avgGeminiLatency * geminiCalls + avgSpeechLatency * speechCalls) / totalCalls : 0;

    return {
      totalCalls,
      averageLatency: avgLatency,
      errorCount: totalErrors,
      errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
      byService: {
        gemini: {
          calls: geminiCalls,
          averageLatency: avgGeminiLatency,
          errors: geminiErrors,
        },
        speechToText: {
          calls: speechCalls,
          averageLatency: avgSpeechLatency,
          errors: speechErrors,
        },
      },
    };
  }

  /**
   * Get cost metrics
   *
   * @returns Cost metrics
   */
  getCostMetrics(): CostMetrics {
    const smsCount = this.metrics.get('cost_twilio_sms') || 0;
    const mmsCount = this.metrics.get('cost_twilio_mms') || 0;
    const twilioCost = this.metrics.get('cost_twilio_total') || 0;

    const geminiCalls = this.metrics.get('cost_google_gemini') || 0;
    const speechMinutes = this.metrics.get('cost_google_speechToText') || 0;
    const googleCost = this.metrics.get('cost_google_total') || 0;

    const totalCost = twilioCost + googleCost;

    // Check cost threshold
    if (totalCost > this.alertConfig.costThreshold) {
      this.triggerAlert({
        type: 'cost_threshold',
        severity: 'warning',
        message: `Daily cost threshold exceeded: $${totalCost.toFixed(2)}`,
        value: totalCost,
        threshold: this.alertConfig.costThreshold,
        timestamp: new Date(),
      });
    }

    return {
      twilio: {
        smsCount,
        mmsCount,
        estimatedCost: twilioCost,
      },
      googleCloud: {
        geminiCalls,
        speechToTextMinutes: speechMinutes,
        estimatedCost: googleCost,
      },
      totalEstimatedCost: totalCost,
    };
  }

  /**
   * Get usage statistics for dashboard
   *
   * @param startDate - Start of period
   * @param endDate - End of period
   * @returns Usage statistics
   */
  async getUsageStatistics(startDate: Date, endDate: Date): Promise<UsageStatistics> {
    const messageMetrics = await this.getMessageMetrics(startDate, endDate);
    const aiPerformance = this.getAIPerformanceMetrics();
    const costs = this.getCostMetrics();

    // Get top users
    const topUsers = await this.getTopUsers(startDate, endDate, 10);

    // Get error breakdown
    const errorBreakdown = this.getErrorBreakdown();

    return {
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      messageMetrics,
      aiPerformance,
      costs,
      topUsers,
      errorBreakdown,
    };
  }

  /**
   * Get top users by message count
   *
   * @param startDate - Start of period
   * @param endDate - End of period
   * @param limit - Number of users to return
   * @returns Top users
   */
  private async getTopUsers(
    startDate: Date,
    endDate: Date,
    limit: number
  ): Promise<Array<{ userId: string; messageCount: number; enrichmentCount: number }>> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        SELECT 
          user_id,
          COUNT(DISTINCT source_metadata->>'messageSid') as message_count,
          COUNT(*) as enrichment_count
        FROM enrichment_items
        WHERE created_at >= $1 AND created_at <= $2
          AND source IN ('sms', 'mms')
        GROUP BY user_id
        ORDER BY message_count DESC
        LIMIT $3
        `,
        [startDate, endDate, limit]
      );

      return result.rows.map((row) => ({
        userId: row.user_id,
        messageCount: parseInt(row.message_count, 10),
        enrichmentCount: parseInt(row.enrichment_count, 10),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get error breakdown
   *
   * @returns Error breakdown
   */
  private getErrorBreakdown(): Array<{ errorType: string; count: number; percentage: number }> {
    const errorTypes: Array<{ errorType: string; count: number }> = [];
    let totalErrors = 0;

    // Collect all error metrics
    for (const [key, value] of this.metrics.entries()) {
      if (key.startsWith('error_')) {
        const errorType = key.replace('error_', '');
        errorTypes.push({ errorType, count: value });
        totalErrors += value;
      }
    }

    // Calculate percentages
    return errorTypes.map((error) => ({
      errorType: error.errorType,
      count: error.count,
      percentage: totalErrors > 0 ? (error.count / totalErrors) * 100 : 0,
    }));
  }

  /**
   * Check error rate and trigger alert if threshold exceeded
   */
  private checkErrorRate(): void {
    const totalMessages =
      (this.metrics.get('messages_processed_sms_text') || 0) +
      (this.metrics.get('messages_processed_mms_audio') || 0) +
      (this.metrics.get('messages_processed_mms_image') || 0) +
      (this.metrics.get('messages_processed_mms_video') || 0);

    const totalErrors =
      (this.metrics.get('messages_failed_sms_text') || 0) +
      (this.metrics.get('messages_failed_mms_audio') || 0) +
      (this.metrics.get('messages_failed_mms_image') || 0) +
      (this.metrics.get('messages_failed_mms_video') || 0);

    if (totalMessages > 0) {
      const errorRate = (totalErrors / totalMessages) * 100;

      if (errorRate > this.alertConfig.errorRateThreshold) {
        this.triggerAlert({
          type: 'error_rate',
          severity: errorRate > 10 ? 'critical' : 'warning',
          message: `High error rate detected: ${errorRate.toFixed(2)}%`,
          value: errorRate,
          threshold: this.alertConfig.errorRateThreshold,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Trigger an alert
   *
   * @param alert - Alert event
   */
  private triggerAlert(alert: AlertEvent): void {
    this.alerts.push(alert);

    console.warn(
      `[ALERT ${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message} ` +
        `(value: ${alert.value}, threshold: ${alert.threshold})`
    );

    // In production, this would send notifications via email, Slack, PagerDuty, etc.
  }

  /**
   * Get recent alerts
   *
   * @param limit - Number of alerts to return
   * @returns Recent alerts
   */
  getRecentAlerts(limit: number = 10): AlertEvent[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear all metrics (for testing or period reset)
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.alerts = [];
    console.log('[Monitoring] Metrics cleared');
  }

  /**
   * Reset metrics for a new period (e.g., daily reset)
   */
  resetPeriodMetrics(): void {
    // Keep cost metrics but reset operational metrics
    const twilioSms = this.metrics.get('cost_twilio_sms') || 0;
    const twilioMms = this.metrics.get('cost_twilio_mms') || 0;
    const twilioCost = this.metrics.get('cost_twilio_total') || 0;
    const googleGemini = this.metrics.get('cost_google_gemini') || 0;
    const googleSpeech = this.metrics.get('cost_google_speechToText') || 0;
    const googleCost = this.metrics.get('cost_google_total') || 0;

    this.metrics.clear();

    // Restore cost metrics
    this.metrics.set('cost_twilio_sms', twilioSms);
    this.metrics.set('cost_twilio_mms', twilioMms);
    this.metrics.set('cost_twilio_total', twilioCost);
    this.metrics.set('cost_google_gemini', googleGemini);
    this.metrics.set('cost_google_speechToText', googleSpeech);
    this.metrics.set('cost_google_total', googleCost);

    console.log('[Monitoring] Period metrics reset');
  }
}

// Export singleton instance
export const smsMonitoringService = new SMSMonitoringService();
