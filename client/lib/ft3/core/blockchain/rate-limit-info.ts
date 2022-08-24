export default class RateLimitInfo {
  isActive: boolean;
  maxPoints?: number;
  recoveryTime?: number;
  pointsAtAccountCreation?: number;

  constructor(
    isActive: boolean,
    maxPoints?: number,
    recoveryTime?: number,
    pointsAtAccountCreation?: number
  ) {
    if (
      isActive &&
      (typeof maxPoints === "undefined" ||
        typeof recoveryTime === "undefined" ||
        typeof pointsAtAccountCreation === "undefined")
    )
      throw new Error(
        "If rate limiter is active you need to pass all other parameters"
      );
    this.isActive = isActive;
    this.maxPoints = maxPoints;
    this.recoveryTime = recoveryTime;
    this.pointsAtAccountCreation = pointsAtAccountCreation;
  }
}
