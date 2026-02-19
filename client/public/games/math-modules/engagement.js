// ===== Emoji Kingdom — Engagement Module =====
// Emotion Feedback, Near Miss, Micro-Badges/Challenges

import { t } from './config.js';

// ===== Emotion-Driven Feedback =====
export function getStreakMessage(streak) {
  if (streak >= 10) return t('streak10');
  if (streak >= 8)  return t('streak8');
  if (streak >= 5)  return t('streak5');
  if (streak >= 3)  return t('streak3');
  return '';
}

export function getWrongAfterStreakMessage(prevStreak) {
  if (prevStreak >= 3) return t('wrongAfterStreak');
  return '';
}

export function getBossLevelMessage() {
  return t('bossMsg');
}

// ===== Near Miss System =====
export function checkNearMiss(correctCount, requiredForStar, totalQuestions, timeLeft, isLastQuestion) {
  // Player missed 1-star by exactly 1 answer
  if (correctCount === requiredForStar - 1) return { isNearMiss: true, type: 'oneAway' };
  // Time ran out on last question while it was visible
  if (isLastQuestion && timeLeft <= 0 && correctCount >= requiredForStar - 1) return { isNearMiss: true, type: 'timeUp' };
  return { isNearMiss: false, type: null };
}

export function getNearMissMessage() {
  return t('nearMiss');
}

// ===== Micro-Challenges (Mini Badges) =====
// Track within a single level play
export function createChallengeTracker() {
  return {
    fastAnswers: 0,         // answers < 5 seconds (consecutive count for badge)
    fastConsecutive: 0,      // current consecutive fast answers
    perfectAnswers: 0,       // correct + fast (< 3s)
    usedHint: false,
    totalCorrect: 0,
    totalQuestions: 0,
    questionTimes: [],       // response times per question
  };
}

export function trackAnswer(tracker, correct, responseTime, usedHintThisQ) {
  tracker.totalQuestions++;
  if (correct) {
    tracker.totalCorrect++;
    if (responseTime < 5) {
      tracker.fastConsecutive++;
      tracker.fastAnswers++;
    } else {
      tracker.fastConsecutive = 0;
    }
    if (responseTime < 3 && correct) tracker.perfectAnswers++;
  } else {
    tracker.fastConsecutive = 0;
  }
  if (usedHintThisQ) tracker.usedHint = true;
  tracker.questionTimes.push(responseTime);
}

export function evaluateBadges(tracker) {
  const badges = [];
  // Lightning Fast: 3+ consecutive answers under 5s
  if (tracker.fastAnswers >= 3) {
    badges.push({ id: 'fast', label: t('badgeFast'), icon: '⚡' });
  }
  // No Hint: completed level without using any hint
  if (!tracker.usedHint && tracker.totalQuestions >= 5) {
    badges.push({ id: 'nohint', label: t('badgeNoHint'), icon: '🧠' });
  }
  // Perfect: 5+ perfect answers (correct + < 3s)
  if (tracker.perfectAnswers >= 5) {
    badges.push({ id: 'perfect', label: t('badgePerfect'), icon: '✨' });
  }
  return badges;
}

export function saveBadges(progress, newBadges) {
  if (!progress.badges) progress.badges = [];
  for (const b of newBadges) {
    if (!progress.badges.includes(b.id)) {
      progress.badges.push(b.id);
    }
  }
}

export function getAvgResponseTime(tracker) {
  if (tracker.questionTimes.length === 0) return 10;
  return tracker.questionTimes.reduce((a, b) => a + b, 0) / tracker.questionTimes.length;
}
