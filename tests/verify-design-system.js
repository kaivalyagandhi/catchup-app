#!/usr/bin/env node

/**
 * Design System Verification Script
 * Verifies that the Stone & Clay design system CSS is properly structured
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, message) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}: ${message}`, color);
}

// Read the CSS file
const cssPath = path.join(__dirname, '../public/css/stone-clay-theme.css');

if (!fs.existsSync(cssPath)) {
  log('❌ ERROR: stone-clay-theme.css not found!', 'red');
  process.exit(1);
}

const cssContent = fs.readFileSync(cssPath, 'utf-8');

log('\n' + '='.repeat(60), 'blue');
log('Stone & Clay Design System Verification', 'bold');
log('='.repeat(60) + '\n', 'blue');

let allTestsPassed = true;

// Test 1: Check for Stone scale variables (12 steps)
log('Test 1: Stone Scale Variables', 'bold');
const stoneSteps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const missingStoneVars = stoneSteps.filter(step => 
  !cssContent.includes(`--stone-${step}:`)
);

if (missingStoneVars.length === 0) {
  logTest('Stone Scale', true, 'All 12 steps defined');
} else {
  logTest('Stone Scale', false, `Missing steps: ${missingStoneVars.join(', ')}`);
  allTestsPassed = false;
}

// Test 2: Check for Amber scale variables
log('\nTest 2: Amber Scale Variables', 'bold');
const amberSteps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const missingAmberVars = amberSteps.filter(step => 
  !cssContent.includes(`--amber-${step}:`)
);

if (missingAmberVars.length === 0) {
  logTest('Amber Scale', true, 'All 12 steps defined');
} else {
  logTest('Amber Scale', false, `Missing steps: ${missingAmberVars.join(', ')}`);
  allTestsPassed = false;
}

// Test 3: Check for semantic tokens
log('\nTest 3: Semantic Tokens', 'bold');
const requiredSemanticTokens = [
  '--bg-app',
  '--bg-sidebar',
  '--bg-surface',
  '--bg-hover',
  '--text-primary',
  '--text-secondary',
  '--border-subtle',
  '--accent-primary',
  '--accent-hover'
];

const missingTokens = requiredSemanticTokens.filter(token => 
  !cssContent.includes(`${token}:`)
);

if (missingTokens.length === 0) {
  logTest('Semantic Tokens', true, 'All required tokens defined');
} else {
  logTest('Semantic Tokens', false, `Missing: ${missingTokens.join(', ')}`);
  allTestsPassed = false;
}

// Test 4: Check for dark mode support
log('\nTest 4: Dark Mode Support', 'bold');
const hasDarkMode = cssContent.includes('[data-theme="dark"]');
logTest('Dark Mode', hasDarkMode, hasDarkMode ? 'Dark theme defined' : 'Dark theme missing');
if (!hasDarkMode) allTestsPassed = false;

// Test 5: Check for Latte mode (light) in :root
log('\nTest 5: Latte Mode (Light Theme)', 'bold');
const hasLightMode = cssContent.includes(':root {');
logTest('Latte Mode', hasLightMode, hasLightMode ? 'Light theme defined in :root' : 'Light theme missing');
if (!hasLightMode) allTestsPassed = false;

// Test 6: Check for status colors
log('\nTest 6: Status Colors', 'bold');
const statusColors = [
  '--status-success',
  '--status-error',
  '--status-info',
  '--status-warning'
];

const missingStatusColors = statusColors.filter(color => 
  !cssContent.includes(`${color}:`)
);

if (missingStatusColors.length === 0) {
  logTest('Status Colors', true, 'All status colors defined');
} else {
  logTest('Status Colors', false, `Missing: ${missingStatusColors.join(', ')}`);
  allTestsPassed = false;
}

// Test 7: Check for circle colors (Dunbar's circles)
log('\nTest 7: Circle Colors', 'bold');
const circleColors = [
  '--circle-inner',
  '--circle-close',
  '--circle-active',
  '--circle-casual',
  '--circle-acquaintance'
];

const missingCircleColors = circleColors.filter(color => 
  !cssContent.includes(`${color}:`)
);

if (missingCircleColors.length === 0) {
  logTest('Circle Colors', true, 'All circle colors defined');
} else {
  logTest('Circle Colors', false, `Missing: ${missingCircleColors.join(', ')}`);
  allTestsPassed = false;
}

// Test 8: Check for avatar colors
log('\nTest 8: Avatar Colors', 'bold');
const avatarColors = [
  '--avatar-sage-bg',
  '--avatar-sand-bg',
  '--avatar-rose-bg',
  '--avatar-stone-bg'
];

const missingAvatarColors = avatarColors.filter(color => 
  !cssContent.includes(`${color}:`)
);

if (missingAvatarColors.length === 0) {
  logTest('Avatar Colors', true, 'All avatar colors defined');
} else {
  logTest('Avatar Colors', false, `Missing: ${missingAvatarColors.join(', ')}`);
  allTestsPassed = false;
}

// Test 9: Check for spacing scale
log('\nTest 9: Spacing Scale', 'bold');
const spacingSteps = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
const missingSpacing = spacingSteps.filter(step => 
  !cssContent.includes(`--space-${step}:`)
);

if (missingSpacing.length === 0) {
  logTest('Spacing Scale', true, 'All spacing values defined');
} else {
  logTest('Spacing Scale', false, `Missing: ${missingSpacing.map(s => `--space-${s}`).join(', ')}`);
  allTestsPassed = false;
}

// Test 10: Check for border radius values
log('\nTest 10: Border Radius', 'bold');
const radiusValues = ['sm', 'md', 'lg', 'xl', 'full'];
const missingRadius = radiusValues.filter(val => 
  !cssContent.includes(`--radius-${val}:`)
);

if (missingRadius.length === 0) {
  logTest('Border Radius', true, 'All radius values defined');
} else {
  logTest('Border Radius', false, `Missing: ${missingRadius.map(r => `--radius-${r}`).join(', ')}`);
  allTestsPassed = false;
}

// Test 11: Check for typography tokens
log('\nTest 11: Typography', 'bold');
const typographyTokens = [
  '--font-sans',
  '--text-base',
  '--font-normal',
  '--leading-normal'
];

const missingTypography = typographyTokens.filter(token => 
  !cssContent.includes(`${token}:`)
);

if (missingTypography.length === 0) {
  logTest('Typography', true, 'All typography tokens defined');
} else {
  logTest('Typography', false, `Missing: ${missingTypography.join(', ')}`);
  allTestsPassed = false;
}

// Test 12: Check for transition tokens
log('\nTest 12: Transitions', 'bold');
const transitionTokens = [
  '--transition-fast',
  '--transition-base',
  '--transition-slow'
];

const missingTransitions = transitionTokens.filter(token => 
  !cssContent.includes(`${token}:`)
);

if (missingTransitions.length === 0) {
  logTest('Transitions', true, 'All transition tokens defined');
} else {
  logTest('Transitions', false, `Missing: ${missingTransitions.join(', ')}`);
  allTestsPassed = false;
}

// Final summary
log('\n' + '='.repeat(60), 'blue');
if (allTestsPassed) {
  log('✅ All tests passed! Design system is properly configured.', 'green');
  log('='.repeat(60) + '\n', 'blue');
  process.exit(0);
} else {
  log('❌ Some tests failed. Please review the design system.', 'red');
  log('='.repeat(60) + '\n', 'blue');
  process.exit(1);
}
