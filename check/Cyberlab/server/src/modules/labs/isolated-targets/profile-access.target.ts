export interface TrainingProfile {
  id: number;
  displayName: string;
  role: string;
  bio: string;
  owner: 'CURRENT_TRAINING_LEARNER' | 'OTHER_TRAINING_USER';
}

const profiles: TrainingProfile[] = [
  { id: 101, displayName: 'Avery Learner', role: 'Community member', bio: 'Synthetic profile assigned to the training learner.', owner: 'CURRENT_TRAINING_LEARNER' },
  { id: 102, displayName: 'Jordan Training', role: 'Support coordinator', bio: 'Synthetic restricted profile for the IDOR exercise.', owner: 'OTHER_TRAINING_USER' },
];

/**
 * Deliberately omits an ownership check for fixed synthetic profiles. It must
 * never be reused for platform records or real CyberLab users.
 */
export function getTrainingProfile(id: number) {
  const profile = profiles.find((candidate) => candidate.id === id);
  if (!profile) return null;
  return {
    profile,
    completionToken: profile.owner === 'OTHER_TRAINING_USER' ? 'IDOR_PROFILE_ACCESS_CONFIRMED' : null,
  };
}
