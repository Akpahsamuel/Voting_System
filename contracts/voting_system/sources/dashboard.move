
module voting_system::dashboard{





public struct AdminCap has key {
    id: UID,
}


public struct Dashboard has key {
    id: UID,
    proposals_ids: vector<ID>
}




fun init(ctx: &mut TxContext) {
    new(ctx);


    transfer::transfer(
        AdminCap {id: object::new(ctx)},
        ctx.sender()
    );

}



public fun new(ctx: &mut TxContext) {
    let dashboard = Dashboard {
        id: object::new(ctx),
        proposals_ids: vector[]
    };


    transfer::share_object(dashboard);
}



public fun register_proposal(self: &mut Dashboard, proposal_id: ID) {
    self.proposals_ids.push_back(proposal_id);
}













































#[test_only]
public fun issue_admine_cap(ctx: &mut TxContext){
    transfer::transfer(
        AdminCap{id: object::new(ctx)}, 
    ctx.sender()
    );
}










#[test]
fun test_module_init() {
    use sui::test_scenario;

    let creator = @0xCA;

    let mut scenario = test_scenario::begin(creator);
    {
        init(scenario.ctx());
    };

    scenario.next_tx(creator);
    {
        let dashboard = scenario.take_shared<Dashboard>();
        assert!(dashboard.proposals_ids.is_empty());
        test_scenario::return_shared(dashboard);
    };

    scenario.end();
}

}