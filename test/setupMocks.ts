/**
 * Mocking fetchExposedOperations for consistent test results.
 *
 * Why:
 * - `rell.get_app_structure` exhibits delays, particularly in the test pipeline,
 *   due to its dynamic nature and JVM startup time.
 * - Discussions in Rell-dev Zulip stream highlight these issues and emphasize
 *   the need for optimization. [Zulip Discussion](https://chromadev.zulipchat.com/#narrow/stream/144722-Rell-dev/topic/rell.2Eget_app_structure.20Timeouts)
 *
 * This mock bypasses the delays, ensuring fast and reliable test outcomes.
 */
jest.mock("/ft4/utils/exposed-operations", () => ({
  fetchExposedOperations: jest
    .fn()
    .mockResolvedValue(
      new Set([
        "nop",
        "ft4.add_auth_descriptor",
        "ft4.delete_all_auth_descriptors_exclude",
        "ft4.delete_auth_descriptor",
        "ft4.admin.add_rate_limit_points",
        "ft4.admin.mint",
        "ft4.admin.register_account",
        "ft4.admin.register_asset",
        "ft4.burn",
        "ft4.transfer",
        "ft4.evm_auth",
        "ft4.ft_auth",
        "add_ad_to_account",
        "operation_without_auth_message_template",
        "register_account_test",
        "register_asset",
        "add_auth_descriptor_for_account",
        "test_auth",
        "test_authenticated_operation",
        "test_perform_large_transfer",
      ]),
    ),
}));
