import { ftEventEmitter } from "../client/lib/ft4/events";

describe("FTEventEmitter", () => {
  test("should emit and handle addressChange event correctly", () => {
    const mockFn = jest.fn();
    ftEventEmitter.on("addressChange", mockFn);

    const testAddress = "0x123456789abcdef";
    ftEventEmitter.emit("addressChange", testAddress);

    expect(mockFn).toBeCalledWith(testAddress);
  });
});
