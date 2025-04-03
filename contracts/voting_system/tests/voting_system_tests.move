
#[test_only]
module voting_system::voting_system_tests{

use sui::test_scenario;
use voting_system::proposal::{Self, Proposal};
use voting_system::dashboard::{Self, AdminCap, Dashboard};

#[test]
fun test_create_proposal_with_admin_cap(){

    let user = @0xCA;

    let mut scenario = test_scenario::begin(user);
    {
        dashboard::issue_admin_cap(scenario.ctx());
    };

    scenario.next_tx(user);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        new_proposal(&admin_cap, scenario.ctx());
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.next_tx(user);
    {
        let created_proposal = scenario.take_shared<Proposal>();

        assert!(created_proposal.title() == b"Test".to_string());
        assert!(created_proposal.description() == b"Test".to_string());
        assert!(created_proposal.expiration() == 2000000000);
        assert!(created_proposal.voted_no_count() == 0);
        assert!(created_proposal.voted_yes_count() == 0);
        assert!(created_proposal.creator() == user);
        assert!(created_proposal.voter_registry().is_empty());

        test_scenario::return_shared(created_proposal);
    };

    scenario.end();
}

#[test]
#[expected_failure(abort_code = test_scenario::EEmptyInventory)]
fun test_create_proposal_no_admin_cap(){
    let user = @0xB0B;
    let admin = @0xA01;

    let mut scenario = test_scenario::begin(admin);
    {
        dashboard::issue_admin_cap(scenario.ctx());
    };

    scenario.next_tx(user);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        new_proposal(&admin_cap, scenario.ctx());
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.end();
}

#[test]
fun test_register_proposal_as_admin() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        let otw = dashboard::new_otw(scenario.ctx());
        dashboard::issue_admin_cap(scenario.ctx());
        dashboard::new(otw, scenario.ctx());
    };

    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let admin_cap = scenario.take_from_sender<AdminCap>();
        let proposal_id = new_proposal(&admin_cap, scenario.ctx());

        dashboard.register_proposal(proposal_id);
        let proposals_ids = dashboard.proposals_ids();
        let proposal_exists = proposals_ids.contains(&proposal_id);

        assert!(proposal_exists);

        scenario.return_to_sender(admin_cap);
        test_scenario::return_shared(dashboard);
    };

    scenario.end();
}

fun new_proposal(admin_cap: &AdminCap, ctx: &mut TxContext): ID {
    let title = b"Test".to_string();
    let desc = b"Test".to_string();

    let proposal_id = proposal::create(
        admin_cap,
        title,
        desc,
        2000000000,
        ctx
    );

    proposal_id
}





}