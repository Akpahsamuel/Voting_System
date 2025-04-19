module voting_system::dashboard{

// use sui::object::{Self, UID, ID};
// use sui::transfer;
// use sui::tx_context::{Self, TxContext};
use sui::types;
use sui::vec_set::{Self, VecSet};
// use std::vector;

const EDuplicateProposal: u64 = 0;
const EInvalidOtw: u64 = 1;

public struct Dashboard has key {
    id: UID,
    proposals_ids: vector<ID>,
    admin_addresses: VecSet<address> // Track admin addresses
}

public struct AdminCap has key {
    id: UID,
}

public struct DASHBOARD has drop {}

fun init(otw: DASHBOARD, ctx: &mut TxContext) {
    let otw = otw;
    new(otw, ctx);

    // Get sender address
    let sender = tx_context::sender(ctx);

    // Create initial AdminCap and transfer to the sender
    transfer::transfer(
        AdminCap {id: object::new(ctx)},
        sender
    );
}

public fun new(otw: DASHBOARD, ctx: &mut TxContext) {
    assert!(types::is_one_time_witness(&otw), EInvalidOtw);

    // Get sender address to add as the first admin
    let sender = tx_context::sender(ctx);
    let mut admin_set = vec_set::empty<address>();
    vec_set::insert(&mut admin_set, sender);
    
    let dashboard = Dashboard {
        id: object::new(ctx),
        proposals_ids: vector[],
        admin_addresses: admin_set
    };

    transfer::share_object(dashboard);
}

public entry fun register_proposal(self: &mut Dashboard, _admin_cap: &AdminCap, proposal_id: ID) {
    assert!(!self.proposals_ids.contains(&proposal_id), EDuplicateProposal);
    self.proposals_ids.push_back(proposal_id);
}

/// Grants admin privileges to the specified address
/// Can only be called by an existing admin
public entry fun grant_admin(_: &AdminCap, self: &mut Dashboard, new_admin: address, ctx: &mut TxContext) {
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

/// Get all admin addresses from the dashboard
public fun get_admin_addresses(self: &Dashboard): vector<address> {
    vec_set::into_keys(self.admin_addresses)
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
        test_scenario::return_shared(dashboard);
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

    // Original admin grants privileges to new address
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let admin_cap = scenario.take_from_sender<AdminCap>();
        grant_admin(&admin_cap, &mut dashboard, new_admin, scenario.ctx());
        
        scenario.return_to_sender(admin_cap);
        test_scenario::return_shared(dashboard);
    };

    // Verify new admin has received an AdminCap
    scenario.next_tx(new_admin);
    {
        assert!(scenario.has_most_recent_for_sender<AdminCap>(), 0);
    };

    scenario.end();
}

}