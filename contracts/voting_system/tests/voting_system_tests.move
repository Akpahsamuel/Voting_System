
#[test_only]
module voting_system::voting_system_tests{
    use sui::test_scenario;
    use voting_system::proposal::{Self, Proposal};
    use voting_system::dashboard::AdminCap;


#[test]
fun test_create_proposal(){
    

    let user = @0xCA;
    let mut scenario = test_scenario::begin(user);
    let admin_cap = scenario.take_from_sender<AdminCap>();
    {
        let title = b"Hi".to_string();
        let desc = b"There".to_string();
        proposal::create(
            &admin_cap,
            title, 
            desc, 
            2000000000, 
            scenario.ctx()
            );


        test_scenario::return_to_sender(&scenario, admin_cap);    
    };

    scenario.next_tx(user);
    {
        let created_proposal = scenario.take_shared<Proposal>();

        assert!(created_proposal.title() == b"Hi".to_string());
        assert!(created_proposal.description() == b"There".to_string());
        assert!(created_proposal.expiration() == 2000000000);
        assert!(created_proposal.voted_no_count() == 0);
        assert!(created_proposal.voted_yes_count() == 0);
        assert!(created_proposal.creator() == user);
        assert!(created_proposal.voter_registry().is_empty());

        test_scenario::return_shared(created_proposal);
    };

    scenario.end();
}


}