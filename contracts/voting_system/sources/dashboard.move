#[allow(unused_const)]

module voting_system::dashboard{

// use sui::object::{Self, UID, ID};
// use sui::transfer;
// use sui::tx_context::{Self, TxContext};
use sui::types;
use sui::vec_set::{Self, VecSet};
// use std::vector;

const EDuplicateProposal: u64 = 0;
const EInvalidOtw: u64 = 1;
const ENotSuperAdmin: u64 = 2;
const ESuperAdminRequired: u64 = 3;
const ECapRevoked: u64 = 4;
const EAdminNotAuthorized: u64 = 5;
const ECannotRevokeDeployer: u64 = 6;

/// Dashboard tracks all proposals, admins, and revoked capability IDs
public struct Dashboard has key {
    id: UID,
    proposals_ids: vector<ID>,
    admin_addresses: VecSet<address>, // Track admin addresses
    super_admin_addresses: VecSet<address>, // Track superadmin addresses
    revoked_admin_caps: VecSet<ID>, // Track IDs of revoked AdminCaps
    revoked_super_admin_caps: VecSet<ID> // Track IDs of revoked SuperAdminCaps
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
        revoked_super_admin_caps
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

/// Register a proposal with an AdminCap
/// Aborts if the AdminCap has been revoked
public entry fun register_proposal(self: &mut Dashboard, admin_cap: &AdminCap, proposal_id: ID) {
    // Check if AdminCap is revoked
    assert!(!is_admin_cap_revoked(self, &object::id(admin_cap)), ECapRevoked);
    
    assert!(!self.proposals_ids.contains(&proposal_id), EDuplicateProposal);
    self.proposals_ids.push_back(proposal_id);
}

/// SuperAdmin can also register proposals
public entry fun register_proposal_super(self: &mut Dashboard, super_admin_cap: &SuperAdminCap, proposal_id: ID) {
    // Check if SuperAdminCap is revoked
    assert!(!is_super_admin_cap_revoked(self, &object::id(super_admin_cap)), ECapRevoked);
    
    assert!(!self.proposals_ids.contains(&proposal_id), EDuplicateProposal);
    self.proposals_ids.push_back(proposal_id);
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
        vec_set::insert(&mut self.super_admin_addresses, new_super_admin);
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

public fun proposals_ids(self: &Dashboard): vector<ID> {
    self.proposals_ids
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