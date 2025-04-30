#[test_only]
module voting_system::voting_system_tests{

use sui::test_scenario;
use sui::clock;
// use sui::object::{Self, ID};
// use sui::tx_context::TxContext;
use voting_system::proposal::{Self, Proposal, VoteProofNFT};
use voting_system::dashboard::{Self, AdminCap, Dashboard};

const EWrongVoteCount: u64 = 0;
const EWrongNftUrl: u64 = 1;
const EWrongStatus: u64 = 2;

fun new_proposal(admin_cap: &AdminCap, ctx: &mut TxContext): ID {
    let title = b"Test".to_string();
    let desc = b"Test".to_string();

    let proposal_id = proposal::create(
        admin_cap,
        title,
        desc,
        2000000000000,
        false,
        ctx
    );

    proposal_id
}

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
        assert!(created_proposal.expiration() == 2000000000000);
        assert!(created_proposal.voted_no_count() == 0);
        assert!(created_proposal.voted_yes_count() == 0);
        assert!(created_proposal.creator() == user);
        assert!(created_proposal.voters().is_empty());

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

        dashboard::register_proposal(&mut dashboard, &admin_cap, proposal_id, false, scenario.ctx());
        
        let proposals_ids = dashboard::proposals_ids(&dashboard);
        let proposal_exists = std::vector::contains(&proposals_ids, &proposal_id);

        assert!(proposal_exists);

        scenario.return_to_sender(admin_cap);
        test_scenario::return_shared(dashboard);
    };

    scenario.end();
}

#[test]
fun test_voting() {
    let bob = @0xB0B;
    let alice = @0xA11CE;
    let admin = @0xA01;

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
        
        dashboard::register_proposal(&mut dashboard, &admin_cap, proposal_id, false, scenario.ctx());
        
        scenario.return_to_sender(admin_cap);
        test_scenario::return_shared(dashboard);
    };

    scenario.next_tx(bob);
    {
        let  dashboard = scenario.take_shared<Dashboard>();
        let mut proposal = scenario.take_shared<Proposal>();

        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);
        
        proposal::vote(&mut proposal, &dashboard, true, &test_clock, scenario.ctx());

        assert!(proposal::voted_yes_count(&proposal) == 1, EWrongVoteCount);
        
        test_scenario::return_shared(proposal);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.next_tx(alice);
    {
        let  dashboard = scenario.take_shared<Dashboard>();
        let mut proposal = scenario.take_shared<Proposal>();

        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);

        proposal::vote(&mut proposal, &dashboard, true, &test_clock, scenario.ctx());

        assert!(proposal::voted_yes_count(&proposal) == 2, EWrongVoteCount);
        assert!(proposal::voted_no_count(&proposal) == 0, EWrongVoteCount);

        test_scenario::return_shared(proposal);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.end();
}

#[test]
#[expected_failure(abort_code = voting_system::proposal::EDuplicateVote)]
fun test_duplicate_voting() {
    let bob = @0xB0B;
    let admin = @0xA01;

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
        
        dashboard::register_proposal(&mut dashboard, &admin_cap, proposal_id, false, scenario.ctx());
        
        scenario.return_to_sender(admin_cap);
        test_scenario::return_shared(dashboard);
    };

    scenario.next_tx(bob);
    {
        let  dashboard = scenario.take_shared<Dashboard>();
        let mut proposal = scenario.take_shared<Proposal>();

        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);

        proposal::vote(&mut proposal, &dashboard, true, &test_clock, scenario.ctx());
        proposal::vote(&mut proposal, &dashboard, true, &test_clock, scenario.ctx());

        test_scenario::return_shared(proposal);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.end();
}

#[test]
fun test_issue_vote_proof() {
    let bob = @0xB0B;
    let admin = @0xA01;

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
        
        dashboard::register_proposal(&mut dashboard, &admin_cap, proposal_id, false, scenario.ctx());
        
        scenario.return_to_sender(admin_cap);
        test_scenario::return_shared(dashboard);
    };

    scenario.next_tx(bob);
    {
        let  dashboard = scenario.take_shared<Dashboard>();
        let mut proposal = scenario.take_shared<Proposal>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);

        proposal::vote(&mut proposal, &dashboard, true, &test_clock, scenario.ctx());
        
        test_scenario::return_shared(proposal);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.next_tx(bob);
    {
        let vote_proof = scenario.take_from_sender<VoteProofNFT>();
        assert!(proposal::vote_proof_url(&vote_proof).inner_url() == b"https://lionprado.sirv.com/vote_yes_nft.png".to_ascii_string(), EWrongNftUrl);
        scenario.return_to_sender(vote_proof);
    };

    scenario.end();
}

#[test]
fun test_change_proposal_status() {
   let admin = @0xA01;

    let mut scenario = test_scenario::begin(admin);
    {
        dashboard::issue_admin_cap(scenario.ctx());
    };

    scenario.next_tx(admin);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        new_proposal(&admin_cap, scenario.ctx());
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.next_tx(admin);
    {
        let proposal = scenario.take_shared<Proposal>();
        assert!(proposal::is_active(&proposal));
        test_scenario::return_shared(proposal);
    };

    scenario.next_tx(admin);
    {
        let mut proposal = scenario.take_shared<Proposal>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        proposal::set_delisted_status(&mut proposal, &admin_cap);

        assert!(!proposal::is_active(&proposal), EWrongStatus);

        test_scenario::return_shared(proposal);
        scenario.return_to_sender(admin_cap);
    };

    scenario.next_tx(admin);
    {
        let mut proposal = scenario.take_shared<Proposal>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        proposal::set_active_status(&mut proposal, &admin_cap);

        assert!(proposal::is_active(&proposal), EWrongStatus);

        test_scenario::return_shared(proposal);
        scenario.return_to_sender(admin_cap);
    };

    scenario.end();
}

#[test]
#[expected_failure(abort_code = voting_system::proposal::EProposalExpired)]
fun test_voting_expiration() {
    let bob = @0xB0B;
    let admin = @0xA01;

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
        
        dashboard::register_proposal(&mut dashboard, &admin_cap, proposal_id, false, scenario.ctx());
        
        scenario.return_to_sender(admin_cap);
        test_scenario::return_shared(dashboard);
    };

    scenario.next_tx(bob);
    {
        let  dashboard = scenario.take_shared<Dashboard>();
        let mut proposal = scenario.take_shared<Proposal>();

        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(2000000000001);
        
        proposal::vote(&mut proposal, &dashboard, true, &test_clock, scenario.ctx());

        test_scenario::return_shared(proposal);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.end();
}

#[test]
fun test_private_proposal() {
    let admin = @0xCA;
    let allowed_voter = @0xCB;
    let unregistered_voter = @0xCC;

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
        
        let title = b"Private Test".to_string();
        let desc = b"Private Test Description".to_string();
        
        let proposal_id = proposal::create(
            &admin_cap,
            title,
            desc,
            2000000000000,
            true,
            scenario.ctx()
        );
        
        dashboard::register_proposal(
            &mut dashboard, 
            &admin_cap, 
            proposal_id,
            true,
            scenario.ctx()
        );
        
        dashboard::register_voter_for_private_proposal(
            &admin_cap,
            &mut dashboard,
            proposal_id,
            allowed_voter,
            scenario.ctx()
        );
        
        assert!(dashboard::is_voter_registered_for_proposal(&dashboard, proposal_id, allowed_voter), 0);
        assert!(!dashboard::is_voter_registered_for_proposal(&dashboard, proposal_id, unregistered_voter), 0);
        
        scenario.return_to_sender(admin_cap);
        test_scenario::return_shared(dashboard);
    };

    scenario.next_tx(allowed_voter);
    {
        let  dashboard = scenario.take_shared<Dashboard>();
        let mut proposal = scenario.take_shared<Proposal>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);
        
        proposal::vote(&mut proposal, &dashboard, true, &test_clock, scenario.ctx());
        
        assert!(proposal::voted_yes_count(&proposal) == 1, 0);
        
        test_scenario::return_shared(proposal);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };
    
    scenario.end();
}

#[test]
#[expected_failure(abort_code = voting_system::proposal::ENotRegisteredVoter)]
fun test_private_proposal_unauthorized_voter() {
    let admin = @0xCA;
    let allowed_voter = @0xCB;
    let unregistered_voter = @0xCC;

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
        
        let title = b"Private Test".to_string();
        let desc = b"Private Test Description".to_string();
        
        let proposal_id = proposal::create(
            &admin_cap,
            title,
            desc,
            2000000000000,
            true,
            scenario.ctx()
        );
        
        dashboard::register_proposal(
            &mut dashboard, 
            &admin_cap, 
            proposal_id,
            true,
            scenario.ctx()
        );
        
        dashboard::register_voter_for_private_proposal(
            &admin_cap,
            &mut dashboard,
            proposal_id,
            allowed_voter,
            scenario.ctx()
        );
        
        scenario.return_to_sender(admin_cap);
        test_scenario::return_shared(dashboard);
    };

    scenario.next_tx(unregistered_voter);
    {
        let  dashboard = scenario.take_shared<Dashboard>();
        let mut proposal = scenario.take_shared<Proposal>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);
        
        proposal::vote(&mut proposal, &dashboard, true, &test_clock, scenario.ctx());
        
        test_scenario::return_shared(proposal);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };
    
    scenario.end();
}

}

