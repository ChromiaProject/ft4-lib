

export default class RateLimitInfo {

  isActive: boolean;
  maxPoints: number;
  recoveryTime: number;
  pointsAtAccountCreation: number;

  constructor(isActive: boolean, maxPoints: number, recoveryTime: number, pointsAtAccountCreation: number) {
    this.isActive = isActive;
    this.maxPoints = maxPoints;
    this.recoveryTime = recoveryTime;
    this.pointsAtAccountCreation = pointsAtAccountCreation;
  }
}