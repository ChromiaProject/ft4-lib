import * as pcl from "postchain-client";

module.exports = {
  ...pcl,
  isBlockAnchored: jest.fn().mockReturnValue(false),
  getAnchoringClient: jest.fn(),
};
