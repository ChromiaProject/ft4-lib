import {
  Listener,
  onAccountAddressChange,
  offAccountAddressChange,
} from "../client/lib/ft4/events";
import { ftEventEmitter } from "../client/lib/ft4/events/emitter";

describe("EventEmitter functionality", () => {
  let listener: Listener<[string]>;
  const newAddress = "newAddressTest";

  beforeEach(() => {
    listener = jest.fn(); // Mock function
  });

  afterEach(() => {
    ftEventEmitter.off("AccountAddressChange", listener); // Clean up after each test
  });

  it("should register an event listener", () => {
    onAccountAddressChange(listener);
    expect(ftEventEmitter["events"]["AccountAddressChange"]).toContain(
      listener,
    );
  });

  it("should call the event listener when the event is emitted", () => {
    onAccountAddressChange(listener);
    ftEventEmitter.emit("AccountAddressChange", newAddress);
    expect(listener).toHaveBeenCalledWith(newAddress);
  });

  it("should remove the event listener", () => {
    onAccountAddressChange(listener);
    offAccountAddressChange(listener);
    expect(ftEventEmitter["events"]["AccountAddressChange"]).not.toContain(
      listener,
    );
  });

  it("should not call the event listener after it's been removed", () => {
    onAccountAddressChange(listener);
    offAccountAddressChange(listener);
    ftEventEmitter.emit("AccountAddressChange", newAddress);
    expect(listener).not.toHaveBeenCalled();
  });
});
