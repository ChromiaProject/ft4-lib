export function accountAuthDescriptors(accountId: Buffer): [string, object] {
    return ['ft3.get_account_auth_descriptors', { id: accountId }];
}

export function accountById(id: Buffer): [string, object] {
    return ['ft3.get_account_by_id', { id: id }];
}

export function accountsByParticipantId(id: Buffer): [string, object] {
    return ['ft3.get_accounts_by_participant_id', { id: id }];
}

export function accountsByAuthDescriptorId(id: Buffer): [string, object] {
    return ['ft3.get_accounts_by_auth_descriptor_id', { descriptor_id: id }];
}