import { EventHandlers, Listener, ftEventEmitter } from "@ft4/events";

describe("EventEmitter functionality", () => {
  let listener: Listener<[string]>;
  const testData = "testData";

  beforeEach(() => {
    listener = jest.fn(); // Mock function
  });

  afterEach(() => {
    ftEventEmitter.off("NoOp", listener); // Clean up after each test
  });

  it("should register an event listener", () => {
    EventHandlers.onNoOp(listener);
    expect(ftEventEmitter["events"]["NoOp"]).toContain(listener);
  });

  it("should call the event listener when the event is emitted", () => {
    EventHandlers.onNoOp(listener);
    ftEventEmitter.emit("NoOp", testData);
    expect(listener).toHaveBeenCalledWith(testData);
  });

  it("should remove the event listener", () => {
    EventHandlers.onNoOp(listener);
    EventHandlers.offNoOp(listener);
    expect(ftEventEmitter["events"]["NoOp"]).not.toContain(listener);
  });

  it("should not call the event listener after it's been removed", () => {
    EventHandlers.onNoOp(listener);
    EventHandlers.offNoOp(listener);
    ftEventEmitter.emit("NoOp", testData);
    expect(listener).not.toHaveBeenCalled();
  });
});
