import * as pcl from "postchain-client";

module.exports = {
  ...pcl,
  isBlockAnchored: jest.fn().mockResolvedValue(false),
  getAnchoringClient: jest.fn(),
};
