#[allow(unused_const)]

module voting_system::dashboard{

use sui::object::{Self, UID, ID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::types;
use sui::vec_set::{Self, VecSet};
use std::vector;

const EDuplicateProposal: u64 = 0;
const EInvalidOtw: u64 = 1;
const ENotSuperAdmin: u64 = 2;
const ESuperAdminRequired: u64 = 3;
const EAdminNotAuthorized: u64 = 4;
const ESuperAdminNotAuthorized: u64 = 5;

/// Dashboard tracks all proposals, admins, and revoked capability IDs
public struct Dashboard has key {
    id: UID,
    proposals_ids: vector<ID>,
    admin_addresses: VecSet<address>, // Track admin addresses
    super_admin_addresses: VecSet<address>, // Track superadmin addresses
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
    
    vec_set::insert(&mut admin_set, sender);
    vec_set::insert(&mut super_admin_set, sender);
    
    let dashboard = Dashboard {
        id: object::new(ctx),
        proposals_ids: vector[],
        admin_addresses: admin_set,
        super_admin_addresses: super_admin_set,
    };

    transfer::share_object(dashboard);
}

/// Check if an address is an admin
public fun is_admin(self: &Dashboard, addr: address): bool {
    vec_set::contains(&self.admin_addresses, &addr)
}

/// Check if an address is a superadmin
public fun is_super_admin(self: &Dashboard, addr: address): bool {
    vec_set::contains(&self.super_admin_addresses, &addr)
}

/// Register a proposal with an AdminCap
/// Aborts if the address is not authorized as admin
public entry fun register_proposal(self: &mut Dashboard, admin_cap: &AdminCap, proposal_id: ID, ctx: &TxContext) {
    // Check if the caller's address is in the admin set
    let sender = tx_context::sender(ctx);
    assert!(is_admin(self, sender), EAdminNotAuthorized);
    
    assert!(!vector::contains(&self.proposals_ids, &proposal_id), EDuplicateProposal);
    vector::push_back(&mut self.proposals_ids, proposal_id);
}

/// SuperAdmin can also register proposals
public entry fun register_proposal_super(self: &mut Dashboard, super_admin_cap: &SuperAdminCap, proposal_id: ID, ctx: &TxContext) {
    // Check if the caller's address is in the superadmin set
    let sender = tx_context::sender(ctx);
    assert!(is_super_admin(self, sender), ESuperAdminNotAuthorized);
    
    assert!(!vector::contains(&self.proposals_ids, &proposal_id), EDuplicateProposal);
    vector::push_back(&mut self.proposals_ids, proposal_id);
}

/// Grants admin privileges to the specified address
/// Only super admins can grant admin access
public entry fun grant_admin_super(super_admin_cap: &SuperAdminCap, self: &mut Dashboard, new_admin: address, ctx: &mut TxContext) {
    // Check if the caller's address is in the superadmin set
    let sender = tx_context::sender(ctx);
    assert!(is_super_admin(self, sender), ESuperAdminNotAuthorized);
    
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
    // Check if the caller's address is in the superadmin set
    let sender = tx_context::sender(ctx);
    assert!(is_super_admin(self, sender), ESuperAdminNotAuthorized);
    
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
/// This function only removes the address from the admin registry
public entry fun revoke_admin(super_admin_cap: &SuperAdminCap, self: &mut Dashboard, admin_to_revoke: address, ctx: &TxContext) {
    // Check if the caller's address is in the superadmin set
    let sender = tx_context::sender(ctx);
    assert!(is_super_admin(self, sender), ESuperAdminNotAuthorized);
    
    // Remove admin from the admin_addresses set
    if (vec_set::contains(&self.admin_addresses, &admin_to_revoke)) {
        vec_set::remove(&mut self.admin_addresses, &admin_to_revoke);
    };
}

/// Revokes super admin privileges from the specified address
/// Can only be called by another superadmin
/// This function only removes the address from both admin and superadmin registries
public entry fun revoke_super_admin(super_admin_cap: &SuperAdminCap, self: &mut Dashboard, super_admin_to_revoke: address, ctx: &TxContext) {
    // Check if the caller's address is in the superadmin set
    let sender = tx_context::sender(ctx);
    assert!(is_super_admin(self, sender), ESuperAdminNotAuthorized);
    
    // Remove from super admin set
    if (vec_set::contains(&self.super_admin_addresses, &super_admin_to_revoke)) {
        vec_set::remove(&mut self.super_admin_addresses, &super_admin_to_revoke);
    };
    
    // Also remove from admin set if they are there
    if (vec_set::contains(&self.admin_addresses, &super_admin_to_revoke)) {
        vec_set::remove(&mut self.admin_addresses, &super_admin_to_revoke);
    };
}

/// Get all admin addresses from the dashboard
public fun get_admin_addresses(self: &Dashboard): vector<address> {
    vec_set::into_keys(self.admin_addresses)
}

/// Get all superadmin addresses from the dashboard
public fun get_super_admin_addresses(self: &Dashboard): vector<address> {
    vec_set::into_keys(self.super_admin_addresses)
}

public fun proposals_ids(self: &Dashboard): vector<ID> {
    self.proposals_ids
}

#[test_only]
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

    // Verify new admin has received an AdminCap and is in the admin set
    scenario.next_tx(new_admin);
    {
        assert!(scenario.has_most_recent_for_sender<AdminCap>(), 0);
        
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(is_admin(&dashboard, new_admin), 0);
        test_scenario::return_shared(dashboard);
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

    // Verify new superadmin has received a SuperAdminCap and is in the superadmin set
    scenario.next_tx(new_super_admin);
    {
        assert!(scenario.has_most_recent_for_sender<SuperAdminCap>(), 0);
        
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(is_super_admin(&dashboard, new_super_admin), 0);
        test_scenario::return_shared(dashboard);
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

    // Verify admin has been added
    scenario.next_tx(super_admin);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(is_admin(&dashboard, admin), 0);
        test_scenario::return_shared(dashboard);
    };

    // Superadmin revokes admin privileges
    scenario.next_tx(super_admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        revoke_admin(&super_admin_cap, &mut dashboard, admin, scenario.ctx());
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };

    // Verify admin has been removed
    scenario.next_tx(super_admin);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(!is_admin(&dashboard, admin), 0);
        test_scenario::return_shared(dashboard);
    };

    scenario.end();
}

#[test]
fun test_revoke_super_admin() {
    use sui::test_scenario;

    // Setup superadmin and another superadmin to be revoked
    let super_admin = @0xCA;
    let other_super_admin = @0xCB;

    let mut scenario = test_scenario::begin(super_admin);
    {
        let otw = DASHBOARD{};
        init(otw, scenario.ctx());
    };

    // First superadmin grants super admin privileges to another
    scenario.next_tx(super_admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        grant_super_admin(&super_admin_cap, &mut dashboard, other_super_admin, scenario.ctx());
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };

    // Verify the other super admin has been added
    scenario.next_tx(super_admin);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(is_super_admin(&dashboard, other_super_admin), 0);
        assert!(is_admin(&dashboard, other_super_admin), 0);
        test_scenario::return_shared(dashboard);
    };

    // First super admin revokes other superadmin's privileges
    scenario.next_tx(super_admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let super_admin_cap = scenario.take_from_sender<SuperAdminCap>();
        revoke_super_admin(&super_admin_cap, &mut dashboard, other_super_admin, scenario.ctx());
        
        scenario.return_to_sender(super_admin_cap);
        test_scenario::return_shared(dashboard);
    };

    // Verify the other super admin has been removed from both sets
    scenario.next_tx(super_admin);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(!is_super_admin(&dashboard, other_super_admin), 0);
        assert!(!is_admin(&dashboard, other_super_admin), 0);
        test_scenario::return_shared(dashboard);
    };

    scenario.end();
}

} 