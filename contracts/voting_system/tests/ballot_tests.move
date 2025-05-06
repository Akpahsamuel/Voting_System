#[test_only]
#[allow(unused_variable, unused_const)]

module voting_system::ballot_tests {

use sui::test_scenario;
use sui::clock;
use voting_system::ballot::{Self, Ballot, BallotVoteProof};
use voting_system::dashboard::{Self, AdminCap, Dashboard};

const EWrongVoteCount: u64 = 0;
const EWrongNftUrl: u64 = 1;
const EWrongStatus: u64 = 2;
const ECandidateNotFound: u64 = 3;

// Helper function to create a new ballot
fun new_ballot(admin_cap: &AdminCap, ctx: &mut TxContext): ID {
    let title = b"Election Ballot".to_string();
    let desc = b"Vote for your favorite candidate".to_string();

    let ballot_id = ballot::create_ballot(
        admin_cap,
        title,
        desc,
        2000000000000, // Set expiration in the future
        false, // Not private
        ctx
    );

    ballot_id
}

// Helper function to add candidates to a ballot
fun add_candidates(ballot: &mut Ballot, admin_cap: &AdminCap, ctx: &mut TxContext) {
    ballot::add_candidate(
        ballot, 
        admin_cap, 
        b"Candidate 1".to_string(), 
        b"First candidate description".to_string(),
        ctx
    );

    ballot::add_candidate(
        ballot, 
        admin_cap, 
        b"Candidate 2".to_string(), 
        b"Second candidate description".to_string(),
        ctx
    );

    ballot::add_candidate(
        ballot, 
        admin_cap, 
        b"Candidate 3".to_string(), 
        b"Third candidate description".to_string(),
        ctx
    );
}

#[test]
fun test_create_ballot_with_admin_cap() {
    let admin = @0xAD;

    let mut scenario = test_scenario::begin(admin);
    {
        dashboard::issue_admin_cap(scenario.ctx());
    };

    scenario.next_tx(admin);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        new_ballot(&admin_cap, scenario.ctx());
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.next_tx(admin);
    {
        let created_ballot = scenario.take_shared<Ballot>();

        assert!(ballot::title(&created_ballot) == b"Election Ballot".to_string(), 0);
        assert!(ballot::description(&created_ballot) == b"Vote for your favorite candidate".to_string(), 0);
        assert!(ballot::expiration(&created_ballot) == 2000000000000, 0);
        assert!(ballot::total_votes(&created_ballot) == 0, 0);
        assert!(ballot::creator(&created_ballot) == admin, 0);
        assert!(ballot::candidate_count(&created_ballot) == 0, 0);
        assert!(ballot::is_active(&created_ballot), 0);

        test_scenario::return_shared(created_ballot);
    };

    scenario.end();
}

#[test]
fun test_add_candidates_to_ballot() {
    let admin = @0xAD;

    let mut scenario = test_scenario::begin(admin);
    {
        dashboard::issue_admin_cap(scenario.ctx());
    };

    scenario.next_tx(admin);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        new_ballot(&admin_cap, scenario.ctx());
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        add_candidates(&mut ballot, &admin_cap, scenario.ctx());

        assert!(ballot::candidate_count(&ballot) == 3, 0);
        assert!(std::vector::length(ballot::candidates(&ballot)) == 3, 0);

        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.end();
}

#[test]
fun test_voting_on_ballot() {
    let admin = @0xAD;
    let voter1 = @0xB0B;
    let voter2 = @0xA11CE;

    let mut scenario = test_scenario::begin(admin);
    {
        let otw = dashboard::new_otw(scenario.ctx());
        dashboard::issue_admin_cap(scenario.ctx());
        dashboard::new(otw, scenario.ctx());
    };

    // Create ballot
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let admin_cap = scenario.take_from_sender<AdminCap>();
        let ballot_id = new_ballot(&admin_cap, scenario.ctx());
        
        // Register the ballot in the dashboard
        dashboard::register_proposal(&mut dashboard, &admin_cap, ballot_id, false, scenario.ctx());
        
        test_scenario::return_shared(dashboard);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Add candidates
    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        add_candidates(&mut ballot, &admin_cap, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // First voter votes for candidate 1
    scenario.next_tx(voter1);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        let mut ballot = scenario.take_shared<Ballot>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000); // Set time before expiration
        
        ballot::vote_for_candidate(&mut ballot, &dashboard, 1, &test_clock, scenario.ctx());
        
        assert!(ballot::total_votes(&ballot) == 1, 0);
        assert!(ballot::get_candidate_votes(&ballot, 1) == 1, 0);
        assert!(ballot::get_candidate_votes(&ballot, 2) == 0, 0);
        
        test_scenario::return_shared(ballot);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    // Second voter votes for candidate 2
    scenario.next_tx(voter2);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        let mut ballot = scenario.take_shared<Ballot>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);
        
        ballot::vote_for_candidate(&mut ballot, &dashboard, 2, &test_clock, scenario.ctx());
        
        assert!(ballot::total_votes(&ballot) == 2, 0);
        assert!(ballot::get_candidate_votes(&ballot, 1) == 1, 0);
        assert!(ballot::get_candidate_votes(&ballot, 2) == 1, 0);
        assert!(ballot::get_candidate_votes(&ballot, 3) == 0, 0);
        
        test_scenario::return_shared(ballot);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    // Check voter gets ballot vote proof NFT
    scenario.next_tx(voter1);
    {
        let vote_proof = scenario.take_from_sender<BallotVoteProof>();
        // We'd check the NFT's properties here
        test_scenario::return_to_sender(&scenario, vote_proof);
    };

    scenario.end();
}

#[test]
#[expected_failure(abort_code = voting_system::ballot::EBallotExpired)]
fun test_voting_on_expired_ballot() {
    let admin = @0xAD;
    let voter = @0xB0B;

    let mut scenario = test_scenario::begin(admin);
    {
        let otw = dashboard::new_otw(scenario.ctx());
        dashboard::issue_admin_cap(scenario.ctx());
        dashboard::new(otw, scenario.ctx());
    };

    // Create ballot
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let admin_cap = scenario.take_from_sender<AdminCap>();
        let ballot_id = new_ballot(&admin_cap, scenario.ctx());
        
        dashboard::register_proposal(&mut dashboard, &admin_cap, ballot_id, false, scenario.ctx());
        
        test_scenario::return_shared(dashboard);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Add candidates
    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        add_candidates(&mut ballot, &admin_cap, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Try to vote after ballot has expired
    scenario.next_tx(voter);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        let mut ballot = scenario.take_shared<Ballot>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(2000000000001); // Set time after expiration
        
        // This should fail with EBallotExpired
        ballot::vote_for_candidate(&mut ballot, &dashboard, 1, &test_clock, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.end();
}

#[test]
#[expected_failure(abort_code = voting_system::ballot::EDuplicateVote)]
fun test_duplicate_voting_on_ballot() {
    let admin = @0xAD;
    let voter = @0xB0B;

    let mut scenario = test_scenario::begin(admin);
    {
        let otw = dashboard::new_otw(scenario.ctx());
        dashboard::issue_admin_cap(scenario.ctx());
        dashboard::new(otw, scenario.ctx());
    };

    // Create ballot
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let admin_cap = scenario.take_from_sender<AdminCap>();
        let ballot_id = new_ballot(&admin_cap, scenario.ctx());
        
        dashboard::register_proposal(&mut dashboard, &admin_cap, ballot_id, false, scenario.ctx());
        
        test_scenario::return_shared(dashboard);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Add candidates
    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        add_candidates(&mut ballot, &admin_cap, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Voter votes once
    scenario.next_tx(voter);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        let mut ballot = scenario.take_shared<Ballot>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);
        
        ballot::vote_for_candidate(&mut ballot, &dashboard, 1, &test_clock, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    // Voter tries to vote again (should fail)
    scenario.next_tx(voter);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        let mut ballot = scenario.take_shared<Ballot>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);
        
        // This should fail with EDuplicateVote
        ballot::vote_for_candidate(&mut ballot, &dashboard, 2, &test_clock, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.end();
}

#[test]
#[expected_failure(abort_code = voting_system::ballot::ECandidateNotFound)]
fun test_voting_for_nonexistent_candidate() {
    let admin = @0xAD;
    let voter = @0xB0B;

    let mut scenario = test_scenario::begin(admin);
    {
        let otw = dashboard::new_otw(scenario.ctx());
        dashboard::issue_admin_cap(scenario.ctx());
        dashboard::new(otw, scenario.ctx());
    };

    // Create ballot
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let admin_cap = scenario.take_from_sender<AdminCap>();
        let ballot_id = new_ballot(&admin_cap, scenario.ctx());
        
        dashboard::register_proposal(&mut dashboard, &admin_cap, ballot_id, false, scenario.ctx());
        
        test_scenario::return_shared(dashboard);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Add candidates
    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        add_candidates(&mut ballot, &admin_cap, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Try to vote for a non-existent candidate
    scenario.next_tx(voter);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        let mut ballot = scenario.take_shared<Ballot>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);
        
        // This should fail with ECandidateNotFound since candidate 10 doesn't exist
        ballot::vote_for_candidate(&mut ballot, &dashboard, 10, &test_clock, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.end();
}

#[test]
fun test_private_ballot() {
    let admin = @0xAD;
    let allowed_voter = @0xB0B;
    let unregistered_voter = @0xA11CE;

    let mut scenario = test_scenario::begin(admin);
    {
        let otw = dashboard::new_otw(scenario.ctx());
        dashboard::issue_admin_cap(scenario.ctx());
        dashboard::new(otw, scenario.ctx());
    };

    // Create private ballot
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let admin_cap = scenario.take_from_sender<AdminCap>();
        
        let title = b"Private Election".to_string();
        let desc = b"Private ballot for selected voters".to_string();
        
        let ballot_id = ballot::create_ballot(
            &admin_cap,
            title,
            desc,
            2000000000000, // Set expiration in the future
            true, // Is private
            scenario.ctx()
        );
        
        // Register the ballot in the dashboard
        dashboard::register_proposal(
            &mut dashboard, 
            &admin_cap, 
            ballot_id,
            true, // Is private
            scenario.ctx()
        );
        
        // Register an allowed voter
        dashboard::register_voter_for_private_proposal(
            &admin_cap,
            &mut dashboard,
            ballot_id,
            allowed_voter,
            scenario.ctx()
        );
        
        test_scenario::return_shared(dashboard);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Add candidates to the ballot
    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        add_candidates(&mut ballot, &admin_cap, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Registered voter votes (should succeed)
    scenario.next_tx(allowed_voter);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        let mut ballot = scenario.take_shared<Ballot>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);
        
        ballot::vote_for_candidate(&mut ballot, &dashboard, 1, &test_clock, scenario.ctx());
        
        assert!(ballot::total_votes(&ballot) == 1, 0);
        assert!(ballot::get_candidate_votes(&ballot, 1) == 1, 0);
        
        test_scenario::return_shared(ballot);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.end();
}

#[test]
#[expected_failure(abort_code = voting_system::ballot::ENotRegisteredVoter)]
fun test_private_ballot_unauthorized_voter() {
    let admin = @0xAD;
    let allowed_voter = @0xB0B;
    let unregistered_voter = @0xA11CE;

    let mut scenario = test_scenario::begin(admin);
    {
        let otw = dashboard::new_otw(scenario.ctx());
        dashboard::issue_admin_cap(scenario.ctx());
        dashboard::new(otw, scenario.ctx());
    };

    // Create private ballot
    scenario.next_tx(admin);
    {
        let mut dashboard = scenario.take_shared<Dashboard>();
        let admin_cap = scenario.take_from_sender<AdminCap>();
        
        let title = b"Private Election".to_string();
        let desc = b"Private ballot for selected voters".to_string();
        
        let ballot_id = ballot::create_ballot(
            &admin_cap,
            title,
            desc,
            2000000000000, // Set expiration in the future
            true, // Is private
            scenario.ctx()
        );
        
        // Register the ballot in the dashboard
        dashboard::register_proposal(
            &mut dashboard, 
            &admin_cap, 
            ballot_id,
            true, // Is private
            scenario.ctx()
        );
        
        // Register an allowed voter
        dashboard::register_voter_for_private_proposal(
            &admin_cap,
            &mut dashboard,
            ballot_id,
            allowed_voter,
            scenario.ctx()
        );
        
        test_scenario::return_shared(dashboard);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Add candidates to the ballot
    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        add_candidates(&mut ballot, &admin_cap, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Unregistered voter tries to vote (should fail)
    scenario.next_tx(unregistered_voter);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        let mut ballot = scenario.take_shared<Ballot>();
        
        let mut test_clock = clock::create_for_testing(scenario.ctx());
        test_clock.set_for_testing(200000000000);
        
        // This should fail with ENotRegisteredVoter
        ballot::vote_for_candidate(&mut ballot, &dashboard, 1, &test_clock, scenario.ctx());
        
        test_scenario::return_shared(ballot);
        test_scenario::return_shared(dashboard);
        test_clock.destroy_for_testing();
    };

    scenario.end();
}

#[test]
fun test_change_ballot_status() {
    let admin = @0xAD;

    let mut scenario = test_scenario::begin(admin);
    {
        dashboard::issue_admin_cap(scenario.ctx());
    };

    scenario.next_tx(admin);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        new_ballot(&admin_cap, scenario.ctx());
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.next_tx(admin);
    {
        let ballot = scenario.take_shared<Ballot>();
        assert!(ballot::is_active(&ballot), 0);
        test_scenario::return_shared(ballot);
    };

    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        ballot::set_ballot_delisted_status(&mut ballot, &admin_cap);
        
        assert!(!ballot::is_active(&ballot), 0);

        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        ballot::set_ballot_active_status(&mut ballot, &admin_cap);
        
        assert!(ballot::is_active(&ballot), 0);

        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.end();
}

#[test]
#[expected_failure(abort_code = voting_system::ballot::EMaxCandidatesReached)]
fun test_max_candidates_limit() {
    let admin = @0xAD;

    let mut scenario = test_scenario::begin(admin);
    {
        dashboard::issue_admin_cap(scenario.ctx());
    };

    scenario.next_tx(admin);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        new_ballot(&admin_cap, scenario.ctx());
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    // Add maximum number of candidates + 1 (should fail)
    scenario.next_tx(admin);
    {
        let mut ballot = scenario.take_shared<Ballot>();
        let admin_cap = scenario.take_from_sender<AdminCap>();

        // Add 21 candidates (exceeds MAX_CANDIDATES which is 20)
        let mut i: u64 = 0;
        while (i < 21) {
            let mut name = b"Candidate ".to_string();
            name.append(i.to_string());
            let mut desc = b"Description for candidate ".to_string();
            desc.append(i.to_string());
            
            ballot::add_candidate(&mut ballot, &admin_cap, name, desc, scenario.ctx());
            i = i + 1;
        };
        
        test_scenario::return_shared(ballot);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };

    scenario.end();
}

}