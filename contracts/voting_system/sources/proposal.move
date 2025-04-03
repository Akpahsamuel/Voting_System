module voting_system::proposal{


use std::string::String;
use voting_system::dashboard::AdminCap;

public struct Proposal has key {
    id: UID,
    title: String,
    description: String,
    voted_yes_count: u64,
    voted_no_count: u64,
    expiration: u64,
    creator: address,
    voter_registry: vector<address>,
}

public fun create(
    _admin_cap: &AdminCap,
    title: String,
    description: String,
    expiration: u64,
    ctx: &mut TxContext
): ID {
    let proposal = Proposal {
        id: object::new(ctx),
        title,
        description,
        voted_yes_count: 0,
        voted_no_count: 0,
        expiration,
        creator: ctx.sender(),
        voter_registry: vector[],
    };

    let id = proposal.id.to_inner();
    transfer::share_object(proposal);

    id
}

public fun title(self: &Proposal): String {
    self.title
}

public fun description(self: &Proposal): String {
    self.description
}

public fun voted_yes_count(self: &Proposal): u64 {
    self.voted_yes_count
}

public fun voted_no_count(self: &Proposal): u64 {
    self.voted_no_count
}

public fun expiration(self: &Proposal): u64 {
    self.expiration
}

public fun creator(self: &Proposal): address {
    self.creator
}

public fun voter_registry(self: &Proposal): vector<address> {
    self.voter_registry
}


}