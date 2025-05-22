#[allow(unused_const, unused_variable)]

module voting_system::dashboard{
use sui::types;
use sui::vec_set::{Self, VecSet};
use sui::dynamic_field as df;


//errors codes

#[error]
const EDuplicateProposal: vector<u8> = b"This proposal ID already exists in the system";
#[error]
const EInvalidOtw: vector<u8> = b"Invalid one-time witness detected during initialization";
#[error]
const ENotSuperAdmin: vector<u8> = b"The operation requires super admin privileges which the caller doesn't have";
#[error]
const ESuperAdminRequired: vector<u8> = b"This action can only be performed by a super administrator";
#[error]
const ECapRevoked: vector<u8> = b"The provided capability has been revoked and is no longer valid";
#[error]
const EAdminNotAuthorized: vector<u8> = b"The administrator is not authorized to perform this action";
#[error]
const ECannotRevokeDeployer: vector<u8> = b"Cannot revoke privileges from the deployer/creator of the contract";
#[error]
const ENotRegisteredVoter: vector<u8> = b"The address is not registered as an eligible voter for this proposal";
#[error]
const ERegistryNotFound: vector<u8> = b"Voter registry not found or the proposal is not configured as private";

/// Type to use as a key for dynamic fields storing voter registries
public struct VoterRegistryKey has copy, drop, store { proposal_id: ID }

/// Voter registry struct stored as dynamic field
public struct VoterRegistry has store {
    registered_voters: VecSet<address>
}

/// Dashboard tracks all proposals, admins, and revoked capability IDs
public struct Dashboard has key {
    id: UID,
    proposals_ids: vector<ID>,
    admin_addresses: VecSet<address>, // Track admin addresses
    super_admin_addresses: VecSet<address>, // Track superadmin addresses
    revoked_admin_caps: VecSet<ID>, // Track IDs of revoked AdminCaps
    revoked_super_admin_caps: VecSet<ID>, // Track IDs of revoked SuperAdminCaps
    private_proposals: VecSet<ID> // Track which proposals are private
}

/// AdminCap represents an administrator capability
public struct AdminCap has key {
    id: UID,
}

/// SuperAdminCap represents a super administrator capability
public struct SuperAdminCap has key {
    id: UID,
}

public struct DASHBOARD has drop {}

fun init(otw: DASHBOARD, ctx: &mut TxContext) {
    let otw = otw;
    new(otw, ctx);

    // Get sender address
    let sender = tx_context::sender(ctx);

    // Create initial SuperAdminCap and transfer to the sender
    transfer::transfer(
        SuperAdminCap {id: object::new(ctx)},
        sender
    );
}

public fun new(otw: DASHBOARD, ctx: &mut TxContext) {
    assert!(types::is_one_time_witness(&otw), EInvalidOtw);

    // Get sender address to add as the first superadmin
    let sender = tx_context::sender(ctx);
    let mut admin_set = vec_set::empty<address>();
    let mut super_admin_set = vec_set::empty<address>();
    let revoked_admin_caps = vec_set::empty<ID>();
    let revoked_super_admin_caps = vec_set::empty<ID>();
    
    vec_set::insert(&mut admin_set, sender);
    vec_set::insert(&mut super_admin_set, sender);
    
    let dashboard = Dashboard {
        id: object::new(ctx),
        proposals_ids: vector[],
        admin_addresses: admin_set,
        super_admin_addresses: super_admin_set,
        revoked_admin_caps,
        revoked_super_admin_caps,
        private_proposals: vec_set::empty<ID>()
    };

    transfer::share_object(dashboard);
}

/// Check if an AdminCap has been revoked
public fun is_admin_cap_revoked(self: &Dashboard, cap_id: &ID): bool {
    vec_set::contains(&self.revoked_admin_caps, cap_id)
}

/// Check if a SuperAdminCap has been revoked
public fun is_super_admin_cap_revoked(self: &Dashboard, cap_id: &ID): bool {
    vec_set::contains(&self.revoked_super_admin_caps, cap_id)
}

/// Check if a proposal is private
public fun is_private_proposal(self: &Dashboard, proposal_id: &ID): bool {
    vec_set::contains(&self.private_proposals, proposal_id)
}

/// Register a proposal with an AdminCap
/// Aborts if the AdminCap has been revoked
public entry fun register_proposal(self: &mut Dashboard, admin_cap: &AdminCap, proposal_id: ID, is_private: bool, ctx: &TxContext) {
    // Check if AdminCap is revoked
    assert!(!is_admin_cap_revoked(self, &object::id(admin_cap)), ECapRevoked);
    
    assert!(!self.proposals_ids.contains(&proposal_id), EDuplicateProposal);
    self.proposals_ids.push_back(proposal_id);
    
    // If proposal is private, mark it and create an empty registry
    if (is_private) {
        vec_set::insert(&mut self.private_proposals, proposal_id);
        df::add(&mut self.id, VoterRegistryKey { proposal_id }, VoterRegistry { registered_voters: vec_set::empty() });
    }
}

/// SuperAdmin can also register proposals
public entry fun register_proposal_super(self: &mut Dashboard, super_admin_cap: &SuperAdminCap, proposal_id: ID, is_private: bool, ctx: &TxContext) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    assert!(!self.proposals_ids.contains(&proposal_id), EDuplicateProposal);
    self.proposals_ids.push_back(proposal_id);
    
    // If proposal is private, mark it and create an empty registry
    if (is_private) {
        vec_set::insert(&mut self.private_proposals, proposal_id);
        df::add(&mut self.id, VoterRegistryKey { proposal_id }, VoterRegistry { registered_voters: vec_set::empty() });
    }
}

/// Register a voter for a private proposal
/// Can only be called by an admin
public entry fun register_voter_for_private_proposal(
    admin_cap: &AdminCap,
    self: &mut Dashboard,
    proposal_id: ID,
    voter_address: address,
    ctx: &TxContext
) {
    // Check if AdminCap is revoked
    assert!(!is_admin_cap_revoked(self, &object::id(admin_cap)), ECapRevoked);
    
    // Verify proposal is private
    assert!(is_private_proposal(self, &proposal_id), ERegistryNotFound);
    
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    assert!(df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key), ERegistryNotFound);
    
    // Add voter to registry
    let registry = df::borrow_mut<VoterRegistryKey, VoterRegistry>(&mut self.id, key);
    if (!vec_set::contains(&registry.registered_voters, &voter_address)) {
        vec_set::insert(&mut registry.registered_voters, voter_address);
    };
}

/// Register a voter for a private proposal using super admin privileges
/// Can only be called by a super admin
public entry fun register_voter_for_private_proposal_super(
    super_admin_cap: &SuperAdminCap,
    self: &mut Dashboard,
    proposal_id: ID,
    voter_address: address,
    ctx: &TxContext
) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    // Verify proposal is private
    assert!(is_private_proposal(self, &proposal_id), ERegistryNotFound);
    
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    assert!(df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key), ERegistryNotFound);
    
    // Add voter to registry
    let registry = df::borrow_mut<VoterRegistryKey, VoterRegistry>(&mut self.id, key);
    if (!vec_set::contains(&registry.registered_voters, &voter_address)) {
        vec_set::insert(&mut registry.registered_voters, voter_address);
    };
}

/// Register multiple voters for a private proposal in a single transaction
/// Can only be called by an admin
public entry fun register_voters_batch_for_private_proposal(
    admin_cap: &AdminCap,
    self: &mut Dashboard,
    proposal_id: ID,
    voter_addresses: vector<address>,
    ctx: &TxContext
) {
    // Check if AdminCap is revoked
    assert!(!is_admin_cap_revoked(self, &object::id(admin_cap)), ECapRevoked);
    
    // Verify proposal is private
    assert!(is_private_proposal(self, &proposal_id), ERegistryNotFound);
    
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    assert!(df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key), ERegistryNotFound);
    
    // Add each voter to the registry
    let registry = df::borrow_mut<VoterRegistryKey, VoterRegistry>(&mut self.id, key);
    let mut i = 0;
    let len = vector::length(&voter_addresses);
    
    while (i < len) {
        let voter_address = *vector::borrow(&voter_addresses, i);
        if (!vec_set::contains(&registry.registered_voters, &voter_address)) {
            vec_set::insert(&mut registry.registered_voters, voter_address);
        };
        i = i + 1;
    }
}

/// Register multiple voters for a private proposal in a single transaction
/// Can only be called by a super admin
public entry fun register_voters_batch_for_private_proposal_super(
    super_admin_cap: &SuperAdminCap,
    self: &mut Dashboard,
    proposal_id: ID,
    voter_addresses: vector<address>,
    ctx: &TxContext
) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    // Verify proposal is private
    assert!(is_private_proposal(self, &proposal_id), ERegistryNotFound);
    
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    assert!(df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key), ERegistryNotFound);
    
    // Add each voter to the registry
    let registry = df::borrow_mut<VoterRegistryKey, VoterRegistry>(&mut self.id, key);
    let mut i = 0;
    let len = vector::length(&voter_addresses);
    
    while (i < len) {
        let voter_address = *vector::borrow(&voter_addresses, i);
        if (!vec_set::contains(&registry.registered_voters, &voter_address)) {
            vec_set::insert(&mut registry.registered_voters, voter_address);
        };
        i = i + 1;
    }
}

/// Unregister a voter from a private proposal
/// Can only be called by an admin
public entry fun unregister_voter_from_private_proposal(
    admin_cap: &AdminCap,
    self: &mut Dashboard,
    proposal_id: ID,
    voter_address: address,
    ctx: &TxContext
) {
    // Check if AdminCap is revoked
    assert!(!is_admin_cap_revoked(self, &object::id(admin_cap)), ECapRevoked);
    
    // Verify proposal is private
    assert!(is_private_proposal(self, &proposal_id), ERegistryNotFound);
    
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    assert!(df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key), ERegistryNotFound);
    
    // Remove voter from registry
    let registry = df::borrow_mut<VoterRegistryKey, VoterRegistry>(&mut self.id, key);
    if (vec_set::contains(&registry.registered_voters, &voter_address)) {
        vec_set::remove(&mut registry.registered_voters, &voter_address);
    };
}

/// Unregister multiple voters from a private proposal in a single transaction
/// Can only be called by an admin
public entry fun unregister_voters_batch_from_private_proposal(
    admin_cap: &AdminCap,
    self: &mut Dashboard,
    proposal_id: ID,
    voter_addresses: vector<address>,
    ctx: &TxContext
) {
    // Check if AdminCap is revoked
    assert!(!is_admin_cap_revoked(self, &object::id(admin_cap)), ECapRevoked);
    
    // Verify proposal is private
    assert!(is_private_proposal(self, &proposal_id), ERegistryNotFound);
    
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    assert!(df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key), ERegistryNotFound);
    
    // Remove each voter from the registry
    let registry = df::borrow_mut<VoterRegistryKey, VoterRegistry>(&mut self.id, key);
    let mut i = 0;
    let len = vector::length(&voter_addresses);
    
    while (i < len) {
        let voter_address = *vector::borrow(&voter_addresses, i);
        if (vec_set::contains(&registry.registered_voters, &voter_address)) {
            vec_set::remove(&mut registry.registered_voters, &voter_address);
        };
        i = i + 1;
    }
}

/// Unregister a voter from a private proposal using super admin privileges
/// Can only be called by a super admin
public entry fun unregister_voter_from_private_proposal_super(
    super_admin_cap: &SuperAdminCap,
    self: &mut Dashboard,
    proposal_id: ID,
    voter_address: address,
    ctx: &TxContext
) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    // Verify proposal is private
    assert!(is_private_proposal(self, &proposal_id), ERegistryNotFound);
    
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    assert!(df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key), ERegistryNotFound);
    
    // Remove voter from registry
    let registry = df::borrow_mut<VoterRegistryKey, VoterRegistry>(&mut self.id, key);
    if (vec_set::contains(&registry.registered_voters, &voter_address)) {
        vec_set::remove(&mut registry.registered_voters, &voter_address);
    };
}

/// Unregister multiple voters from a private proposal in a single transaction
/// Can only be called by a super admin
public entry fun unregister_voters_batch_from_private_proposal_super(
    super_admin_cap: &SuperAdminCap,
    self: &mut Dashboard,
    proposal_id: ID,
    voter_addresses: vector<address>,
    ctx: &TxContext
) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    // Verify proposal is private
    assert!(is_private_proposal(self, &proposal_id), ERegistryNotFound);
    
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    assert!(df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key), ERegistryNotFound);
    
    // Remove each voter from the registry
    let registry = df::borrow_mut<VoterRegistryKey, VoterRegistry>(&mut self.id, key);
    let mut i = 0;
    let len = vector::length(&voter_addresses);
    
    while (i < len) {
        let voter_address = *vector::borrow(&voter_addresses, i);
        if (vec_set::contains(&registry.registered_voters, &voter_address)) {
            vec_set::remove(&mut registry.registered_voters, &voter_address);
        };
        i = i + 1;
    }
}

/// Check if a voter is registered for a specific private proposal
public fun is_voter_registered_for_proposal(self: &Dashboard, proposal_id: ID, voter_address: address): bool {
    // If the proposal is not private, anyone can vote
    if (!is_private_proposal(self, &proposal_id)) {
        return true
    };
    
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    
    // If registry doesn't exist, return false
    if (!df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key)) {
        return false
    };
    
    // Check if voter is in the registry
    let registry = df::borrow<VoterRegistryKey, VoterRegistry>(&self.id, key);
    vec_set::contains(&registry.registered_voters, &voter_address)
}

/// Get all registered voters for a specific private proposal
public fun get_registered_voters(self: &Dashboard, proposal_id: ID): vector<address> {
    // Get the registry key
    let key = VoterRegistryKey { proposal_id };
    
    // If registry doesn't exist or proposal is not private, return empty vector
    if (!is_private_proposal(self, &proposal_id) || !df::exists_with_type<VoterRegistryKey, VoterRegistry>(&self.id, key)) {
        return vector::empty()
    };
    
    // Return all registered voters
    let registry = df::borrow<VoterRegistryKey, VoterRegistry>(&self.id, key);
    vec_set::into_keys(registry.registered_voters)
}

/// Grants admin privileges to the specified address
/// Only super admins can grant admin access
public entry fun grant_admin_super(super_admin_cap: &SuperAdminCap, self: &mut Dashboard, new_admin: address, ctx: &mut TxContext) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    // Add new admin to the admin_addresses set
    if (!vec_set::contains(&self.admin_addresses, &new_admin)) {
        vec_set::insert(&mut self.admin_addresses, new_admin);
    };

    // Create and transfer AdminCap to the new admin
    transfer::transfer(
        AdminCap {id: object::new(ctx)},
        new_admin
    );
}

/// Grants superadmin privileges to the specified address
/// Can only be called by a superadmin
public entry fun grant_super_admin(super_admin_cap: &SuperAdminCap, self: &mut Dashboard, new_super_admin: address, ctx: &mut TxContext) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    // Add new superadmin to the admin_addresses set (superadmins are also admins)
    if (!vec_set::contains(&self.admin_addresses, &new_super_admin)) {
        vec_set::insert(&mut self.admin_addresses, new_super_admin);
    };
    
    // Add to superadmin set
    if (!vec_set::contains(&self.super_admin_addresses, &new_super_admin)) {
        vec_set::insert(&mut self.super_admin_addresses, &new_super_admin);
    };

    // Create and transfer SuperAdminCap to the new superadmin
    transfer::transfer(
        SuperAdminCap {id: object::new(ctx)},
        new_super_admin
    );
}

/// Revokes admin privileges from the specified address
/// Can only be called by a superadmin
/// This function will mark the admin capability as revoked
public entry fun revoke_admin(super_admin_cap: &SuperAdminCap, self: &mut Dashboard, admin_cap_id: ID, admin_to_revoke: address) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    // Prevent revoking the deployer/creator's admin privileges
    // The deployer is the first super admin added during initialization
    let deployer = vec_set::into_keys(self.super_admin_addresses)[0];
    assert!(admin_to_revoke != deployer, ECannotRevokeDeployer);
    
    // Remove admin from the admin_addresses set
    if (vec_set::contains(&self.admin_addresses, &admin_to_revoke)) {
        vec_set::remove(&mut self.admin_addresses, &admin_to_revoke);
    };
    
    // Mark the AdminCap as revoked
    if (!vec_set::contains(&self.revoked_admin_caps, &admin_cap_id)) {
        vec_set::insert(&mut self.revoked_admin_caps, admin_cap_id);
    }
}

/// Revokes super admin privileges from the specified address
/// Can only be called by another superadmin
/// This function will mark the super admin capability as revoked
public entry fun revoke_super_admin(super_admin_cap: &SuperAdminCap, self: &mut Dashboard, super_admin_cap_id: ID, super_admin_to_revoke: address) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    // Prevent revoking the deployer/creator's super admin privileges
    // The deployer is the first super admin added during initialization
    let deployer = vec_set::into_keys(self.super_admin_addresses)[0];
    assert!(super_admin_to_revoke != deployer, ECannotRevokeDeployer);
    
    // Remove from super admin set
    if (vec_set::contains(&self.super_admin_addresses, &super_admin_to_revoke)) {
        vec_set::remove(&mut self.super_admin_addresses, &super_admin_to_revoke);
    };
    
    // Also remove from admin set if they are there
    if (vec_set::contains(&self.admin_addresses, &super_admin_to_revoke)) {
        vec_set::remove(&mut self.admin_addresses, &super_admin_to_revoke);
    };
    
    // Mark the SuperAdminCap as revoked
    if (!vec_set::contains(&self.revoked_super_admin_caps, &super_admin_cap_id)) {
        vec_set::insert(&mut self.revoked_super_admin_caps, super_admin_cap_id);
    }
}

/// Get all admin addresses from the dashboard
public fun get_admin_addresses(self: &Dashboard): vector<address> {
    vec_set::into_keys(self.admin_addresses)
}

/// Get all superadmin addresses from the dashboard
public fun get_super_admin_addresses(self: &Dashboard): vector<address> {
    vec_set::into_keys(self.super_admin_addresses)
}

/// Check if an address is a superadmin
public fun is_super_admin(self: &Dashboard, addr: address): bool {
    vec_set::contains(&self.super_admin_addresses, &addr)
}

/// Get IDs of all revoked AdminCaps
public fun get_revoked_admin_caps(self: &Dashboard): vector<ID> {
    vec_set::into_keys(self.revoked_admin_caps)
}

/// Get IDs of all revoked SuperAdminCaps
public fun get_revoked_super_admin_caps(self: &Dashboard): vector<ID> {
    vec_set::into_keys(self.revoked_super_admin_caps)
}

/// Get all proposal IDs
public fun proposals_ids(self: &Dashboard): vector<ID> {
    self.proposals_ids
}

/// Get all private proposal IDs
public fun private_proposal_ids(self: &Dashboard): vector<ID> {
    vec_set::into_keys(self.private_proposals)
}

#[test_only]
public fun issue_admin_cap(ctx: &mut TxContext) {
    transfer::transfer(
        AdminCap {id: object::new(ctx)},
        ctx.sender()
    );
}

#[test_only]
public fun issue_super_admin_cap(ctx: &mut TxContext) {
    transfer::transfer(
        SuperAdminCap {id: object::new(ctx)},
        ctx.sender()
    );
}

#[test_only]
public fun new_otw(_ctx: &mut TxContext): DASHBOARD {
    DASHBOARD {}
}

#[test]
fun test_private_proposal_registry() {
    use sui::test_scenario;

    let admin = @0xCA;
    let voter1 = @0xCB;
    let voter2 = @0xCC;
    let proposal_id = object::id_from_address(@0xDEAD);

    let mut scenario = test_scenario::begin(admin);
    
    // Initialize
    {
        let otw = DASHBOARD{};
        init(otw, scenario.ctx());
    };

    // Register a private proposal
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        
        register_proposal_super(
            &mut dashboard, 
            &super_admin_cap, 
            proposal_id, 
            true, // is_private
            scenario.ctx()
        );
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };

    // Register voters for the private proposal
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        
        // Register voter1
        register_voter_for_private_proposal_super(
            &super_admin_cap,
            &mut dashboard,
            proposal_id,
            voter1,
            scenario.ctx()
        );
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };
    
    // Check if voter registration works correctly
    scenario.next_tx(admin);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        
        // Voter1 should be registered
        assert!(is_voter_registered_for_proposal(&dashboard, proposal_id, voter1), 0);
        
        // Voter2 should not be registered
        assert!(!is_voter_registered_for_proposal(&dashboard, proposal_id, voter2), 0);
        
        // Verify registered voters array
        let registered_voters = get_registered_voters(&dashboard, proposal_id);
        assert!(vector::length(&registered_voters) == 1, 0);
        assert!(*vector::borrow(&registered_voters, 0) == voter1, 0);
        
        test_scenario::return_shared(dashboard);
    };
    
    // Unregister a voter
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        
        unregister_voter_from_private_proposal_super(
            &super_admin_cap,
            &mut dashboard,
            proposal_id,
            voter1,
            scenario.ctx()
        );
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };
    
    // Verify voter was unregistered
    scenario.next_tx(admin);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        
        assert!(!is_voter_registered_for_proposal(&dashboard, proposal_id, voter1), 0);
        
        let registered_voters = get_registered_voters(&dashboard, proposal_id);
        assert!(vector::length(&registered_voters) == 0, 0);
        
        test_scenario::return_shared(dashboard);
    };

    scenario.end();
}

// Include original tests
#[test]
fun test_module_init() {
    use sui::test_scenario;

    let creator = @0xCA;

    let mut scenario = test_scenario::begin(creator);
    {
        let otw = DASHBOARD{};
        init(otw, scenario.ctx());
    };

    scenario.next_tx(creator);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(dashboard.proposals_ids.is_empty());
        
        // Verify creator is both admin and superadmin
        assert!(vec_set::contains(&dashboard.admin_addresses, &creator), 0);
        assert!(vec_set::contains(&dashboard.super_admin_addresses, &creator), 0);
        
        test_scenario::return_shared(dashboard);
        
        // Verify creator has SuperAdminCap
        assert!(scenario.has_most_recent_for_sender<SuperAdminCap>(), 0);
    };

    scenario.end();
}

#[test]
fun test_grant_admin() {
    use sui::test_scenario;

    // Setup original admin and a new admin address
    let admin = @0xCA;
    let new_admin = @0xCB;

    let mut scenario = test_scenario::begin(admin);
    {
        let otw = DASHBOARD{};
        init(otw, scenario.ctx());
    };

    // Original admin grants privileges to new address using SuperAdminCap
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        grant_admin_super(&super_admin_cap, &mut dashboard, new_admin, scenario.ctx());
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };

    // Verify new admin has received an AdminCap
    scenario.next_tx(new_admin);
    {
        assert!(scenario.has_most_recent_for_sender<AdminCap>(), 0);
    };

    scenario.end();
}

#[test]
fun test_grant_super_admin() {
    use sui::test_scenario;

    // Setup original superadmin and a new superadmin address
    let super_admin = @0xCA;
    let new_super_admin = @0xCB;

    let mut scenario = test_scenario::begin(super_admin);
    {
        let otw = DASHBOARD{};
        init(otw, scenario.ctx());
    };

    // Original superadmin grants superadmin privileges to new address
    scenario.next_tx(super_admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        grant_super_admin(&super_admin_cap, &mut dashboard, new_super_admin, scenario.ctx());
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };

    // Verify new superadmin has received a SuperAdminCap
    scenario.next_tx(new_super_admin);
    {
        assert!(scenario.has_most_recent_for_sender<SuperAdminCap>(), 0);
    };

    scenario.end();
}

#[test]
fun test_revoke_admin() {
    use sui::test_scenario;

    // Setup superadmin, admin to be revoked
    let super_admin = @0xCA;
    let admin = @0xCB;

    let mut scenario = test_scenario::begin(super_admin);
    {
        let otw = DASHBOARD{};
        init(otw, scenario.ctx());
    };

    // Superadmin grants admin privileges
    scenario.next_tx(super_admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        grant_admin_super(&super_admin_cap, &mut dashboard, admin, scenario.ctx());
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };

    // Get the AdminCap ID
    let admin_cap_id: ID;
    scenario.next_tx(admin);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        admin_cap_id = object::id(&admin_cap);
        scenario.return_to_sender(admin_cap);
    };

    // Verify admin has been added
    scenario.next_tx(super_admin);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(vec_set::contains(&dashboard.admin_addresses, &admin), 0);
        test_scenario::return_shared(dashboard);
    };

    // Superadmin revokes admin privileges
    scenario.next_tx(super_admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        revoke_admin(&super_admin_cap, &mut dashboard, admin_cap_id, admin);
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };

    // Verify admin has been removed and cap is revoked
    scenario.next_tx(super_admin);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(!vec_set::contains(&dashboard.admin_addresses, &admin), 0);
        assert!(vec_set::contains(&dashboard.revoked_admin_caps, &admin_cap_id), 0);
        test_scenario::return_shared(dashboard);
    };

    scenario.end();
}

}