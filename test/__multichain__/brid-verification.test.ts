import Brids from "../brids.json";

describe("BRIDs verification", () => {
  for (const [name, brid] of Object.entries(Brids)) {
    test(`BRID for ${name} should not be null`, () => {
      expect(brid).not.toBeNull();
    });
  }
});
