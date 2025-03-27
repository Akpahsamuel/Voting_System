
/// Module: voting_system
module voting_system::dashboard{

public struct Dashboard has key {
    id: UID,
    proposals: vector<ID>,

}

fun init(ctx: &mut TxContext){
    new(ctx)
}


public fun new(ctx: &mut TxContext){
    let dashboard = Dashboard{
        id: object::new(ctx),
        proposals: vector[]
    };
    transfer::share_object(dashboard)

}


public fun create_proposal(self: &mut Dashboard, proposal_id: ID){
    self.proposals.push_back(proposal_id)





}
}