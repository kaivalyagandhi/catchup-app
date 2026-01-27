/**
 * Authentication Statistics API - Usage Examples
 * 
 * This file demonstrates how to use the authentication statistics API
 * to track and analyze authentication method usage.
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Example 1: Get current user's authentication statistics
 */
async function getUserAuthStatistics(token: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/statistics`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('User Authentication Statistics:');
    console.log('================================');
    console.log(`Total Authentications: ${response.data.totalAuthentications}`);
    console.log(`Google SSO: ${response.data.googleSSOAuthentications} (${response.data.googleSSOPercentage}%)`);
    console.log(`Email/Password: ${response.data.emailPasswordAuthentications} (${response.data.emailPasswordPercentage}%)`);
    console.log('\nBreakdown:');
    console.log(`  Successful Google SSO: ${response.data.breakdown.successful.googleSSO}`);
    console.log(`  Successful Email/Password: ${response.data.breakdown.successful.emailPassword}`);
    console.log(`  Failed Google SSO: ${response.data.breakdown.failed.googleSSO}`);
    console.log(`  Failed Email/Password: ${response.data.breakdown.failed.emailPassword}`);

    return response.data;
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
}

/**
 * Example 2: Get authentication statistics for custom date range
 */
async function getAuthStatisticsForDateRange(
  token: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/statistics`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    console.log(`\nAuthentication Statistics (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}):`);
    console.log('='.repeat(80));
    console.log(`Total: ${response.data.totalAuthentications}`);
    console.log(`Google SSO: ${response.data.googleSSOAuthentications}`);
    console.log(`Email/Password: ${response.data.emailPasswordAuthentications}`);

    return response.data;
  } catch (error) {
    console.error('Error fetching statistics for date range:', error);
    throw error;
  }
}

/**
 * Example 3: Get global authentication statistics (admin only)
 */
async function getGlobalAuthStatistics(adminToken: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/statistics/global`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    console.log('\nGlobal Authentication Statistics:');
    console.log('==================================');
    console.log(`Total Authentications: ${response.data.totalAuthentications}`);
    console.log(`Google SSO: ${response.data.googleSSOAuthentications} (${response.data.googleSSOPercentage}%)`);
    console.log(`Email/Password: ${response.data.emailPasswordAuthentications} (${response.data.emailPasswordPercentage}%)`);
    console.log('\nSuccess Rates:');
    const googleSuccessRate = response.data.googleSSOAuthentications > 0
      ? (response.data.breakdown.successful.googleSSO / response.data.googleSSOAuthentications * 100).toFixed(2)
      : 0;
    const emailSuccessRate = response.data.emailPasswordAuthentications > 0
      ? (response.data.breakdown.successful.emailPassword / response.data.emailPasswordAuthentications * 100).toFixed(2)
      : 0;
    console.log(`  Google SSO Success Rate: ${googleSuccessRate}%`);
    console.log(`  Email/Password Success Rate: ${emailSuccessRate}%`);

    return response.data;
  } catch (error) {
    console.error('Error fetching global statistics:', error);
    throw error;
  }
}

/**
 * Example 4: Get statistics for specific user (admin only)
 */
async function getAuthStatisticsForUser(adminToken: string, userId: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/statistics`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      params: {
        userId,
      },
    });

    console.log(`\nAuthentication Statistics for User ${userId}:`);
    console.log('='.repeat(80));
    console.log(`Total: ${response.data.totalAuthentications}`);
    console.log(`Google SSO: ${response.data.googleSSOAuthentications}`);
    console.log(`Email/Password: ${response.data.emailPasswordAuthentications}`);

    return response.data;
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
}

/**
 * Example 5: Monitor authentication trends over time
 */
async function monitorAuthenticationTrends(token: string) {
  try {
    const now = new Date();
    const periods = [
      { name: 'Last 7 days', days: 7 },
      { name: 'Last 30 days', days: 30 },
      { name: 'Last 90 days', days: 90 },
    ];

    console.log('\nAuthentication Trends:');
    console.log('======================');

    for (const period of periods) {
      const startDate = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
      const response = await axios.get(`${API_BASE_URL}/auth/statistics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        },
      });

      console.log(`\n${period.name}:`);
      console.log(`  Total: ${response.data.totalAuthentications}`);
      console.log(`  Google SSO: ${response.data.googleSSOPercentage}%`);
      console.log(`  Email/Password: ${response.data.emailPasswordPercentage}%`);
    }
  } catch (error) {
    console.error('Error monitoring trends:', error);
    throw error;
  }
}

/**
 * Example 6: Calculate authentication success rates
 */
async function calculateSuccessRates(token: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/statistics`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const { breakdown } = response.data;

    const googleTotal = breakdown.successful.googleSSO + breakdown.failed.googleSSO;
    const emailTotal = breakdown.successful.emailPassword + breakdown.failed.emailPassword;

    const googleSuccessRate = googleTotal > 0
      ? (breakdown.successful.googleSSO / googleTotal * 100).toFixed(2)
      : 0;
    const emailSuccessRate = emailTotal > 0
      ? (breakdown.successful.emailPassword / emailTotal * 100).toFixed(2)
      : 0;

    console.log('\nAuthentication Success Rates:');
    console.log('=============================');
    console.log(`Google SSO: ${googleSuccessRate}% (${breakdown.successful.googleSSO}/${googleTotal})`);
    console.log(`Email/Password: ${emailSuccessRate}% (${breakdown.successful.emailPassword}/${emailTotal})`);

    return {
      googleSSO: {
        successRate: parseFloat(googleSuccessRate),
        successful: breakdown.successful.googleSSO,
        failed: breakdown.failed.googleSSO,
        total: googleTotal,
      },
      emailPassword: {
        successRate: parseFloat(emailSuccessRate),
        successful: breakdown.successful.emailPassword,
        failed: breakdown.failed.emailPassword,
        total: emailTotal,
      },
    };
  } catch (error) {
    console.error('Error calculating success rates:', error);
    throw error;
  }
}

/**
 * Example 7: Generate authentication report
 */
async function generateAuthenticationReport(token: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/statistics`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const { breakdown } = response.data;
    const googleTotal = breakdown.successful.googleSSO + breakdown.failed.googleSSO;
    const emailTotal = breakdown.successful.emailPassword + breakdown.failed.emailPassword;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         AUTHENTICATION STATISTICS REPORT                  ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Time Range: ${new Date(response.data.timeRange.start).toLocaleDateString()} - ${new Date(response.data.timeRange.end).toLocaleDateString()}`.padEnd(61) + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Total Authentications: ${response.data.totalAuthentications}`.padEnd(61) + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ GOOGLE SSO                                                 ║');
    console.log(`║   Total: ${googleTotal}`.padEnd(61) + '║');
    console.log(`║   Successful: ${breakdown.successful.googleSSO}`.padEnd(61) + '║');
    console.log(`║   Failed: ${breakdown.failed.googleSSO}`.padEnd(61) + '║');
    console.log(`║   Percentage: ${response.data.googleSSOPercentage}%`.padEnd(61) + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ EMAIL/PASSWORD                                             ║');
    console.log(`║   Total: ${emailTotal}`.padEnd(61) + '║');
    console.log(`║   Successful: ${breakdown.successful.emailPassword}`.padEnd(61) + '║');
    console.log(`║   Failed: ${breakdown.failed.emailPassword}`.padEnd(61) + '║');
    console.log(`║   Percentage: ${response.data.emailPasswordPercentage}%`.padEnd(61) + '║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    return response.data;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

// Export examples for use in other modules
export {
  getUserAuthStatistics,
  getAuthStatisticsForDateRange,
  getGlobalAuthStatistics,
  getAuthStatisticsForUser,
  monitorAuthenticationTrends,
  calculateSuccessRates,
  generateAuthenticationReport,
};

// Example usage (uncomment to run)
/*
async function main() {
  const userToken = 'your-user-jwt-token';
  const adminToken = 'your-admin-jwt-token';

  // Get current user statistics
  await getUserAuthStatistics(userToken);

  // Get statistics for last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await getAuthStatisticsForDateRange(userToken, sevenDaysAgo, new Date());

  // Get global statistics (admin only)
  await getGlobalAuthStatistics(adminToken);

  // Monitor trends
  await monitorAuthenticationTrends(userToken);

  // Calculate success rates
  await calculateSuccessRates(userToken);

  // Generate report
  await generateAuthenticationReport(userToken);
}

main().catch(console.error);
*/
