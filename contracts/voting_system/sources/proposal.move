

module voting_system::proposal {

 use std::string::String;



/// A structure representing a proposal in the voting system.
/// 
/// # Fields
/// * `id`: Unique identifier for the proposal
/// * `title`: The title of the proposal
/// * `description`: Detailed description of what the proposal entails
/// * `voted_yes_count`: Counter for the number of votes in favor of the proposal
/// * `voted_no_count`: Counter for the number of votes against the proposal
/// * `expiration`: Timestamp indicating when the voting period for this proposal ends
/// * `creator`: Address of the account that created this proposal
/// * `voter_registry`: Collection of addresses that have already voted on this proposal
///
/// The proposal is stored on-chain with the `key` ability, making it accessible via object ID.
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


/// Creates and shares a new proposal in the voting system.
/// 
/// # Arguments
/// 
/// * `title` - The title of the proposal
/// * `description` - Detailed description of what the proposal is about
/// * `expiration` - Timestamp (in epochs) when the proposal expires and voting ends
/// * `ctx` - Transaction context containing sender information and object creation capability
/// 
/// # Effects
/// 
/// * Creates a new `Proposal` object with initial vote counts set to 0
/// * Records the creator's address from the transaction context
/// * Initializes an empty voter registry to track who has already voted
/// * Shares the proposal object, making it accessible to all users in the network
public fun create_proposal(
    title: String,
    description: String,
    expiration: u64,
    ctx:&mut TxContext,
){
    let proposal = Proposal{
        id: object::new(ctx),
        title,
        description,
        voted_yes_count: 0,
        voted_no_count: 0,
        expiration,
        creator: ctx.sender(),
        voter_registry: vector[]
    };
    transfer::share_object(proposal)
}

















}















    
