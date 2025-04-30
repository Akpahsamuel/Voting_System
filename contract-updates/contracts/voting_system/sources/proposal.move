module voting_system::proposal{

 use std::string::String;
// use sui::object::{Self, UID, ID};
 use sui::table::{Self, Table};
use sui::url::{Url, new_unsafe_from_bytes};
use sui::clock::{Clock};
use sui::event;
// use sui::transfer;
// use sui::tx_context::{Self, TxContext};
use voting_system::dashboard::{Self, AdminCap, SuperAdminCap, Dashboard};

const EDuplicateVote: u64 = 0;
const EProposalDelisted: u64 = 1;
const EProposalExpired: u64 = 2;
const ENotRegisteredVoter: u64 = 7;

public enum ProposalStatus has store, drop {
    Active,
    Delisted,
}

public struct Proposal has key {
    id: UID,
    title: String,
    description: String,
    voted_yes_count: u64,
    voted_no_count: u64,
    expiration: u64,
    creator: address,
    status: ProposalStatus,
    voters: Table<address, bool>,
    is_private: bool,
}

public struct VoteProofNFT has key {
    id: UID,
    proposal_id: ID,
    name: String,
    description: String,
    url: Url,
}

public struct VoteRegistered has copy, drop {
    proposal_id: ID,
    voter: address,
    vote_yes: bool,
}

// === Public Functions ===

public fun vote(self: &mut Proposal, dashboard: &Dashboard, vote_yes: bool, clock: &Clock, ctx: &mut TxContext) {
    assert!(self.expiration > clock.timestamp_ms(), EProposalExpired);
    assert!(self.is_active(), EProposalDelisted);
    assert!(!self.voters.contains(tx_context::sender(ctx)), EDuplicateVote);

    // Check registration for private proposals
    let is_private = self.is_private;
    if (is_private) {
        let proposal_id = object::uid_to_inner(&self.id);
        // Check if this voter is registered for this proposal
        assert!(dashboard::is_voter_registered_for_proposal(dashboard, proposal_id, tx_context::sender(ctx)), 
               ENotRegisteredVoter);
    };

    // Update vote counts
    let is_yes_vote = vote_yes;
    if (is_yes_vote) {
        self.voted_yes_count = self.voted_yes_count + 1;
    } else {
        self.voted_no_count = self.voted_no_count + 1;
    };

    self.voters.add(tx_context::sender(ctx), vote_yes);
    issue_vote_proof(self, vote_yes, ctx);

    event::emit(VoteRegistered {
        proposal_id: object::uid_to_inner(&self.id),
        voter: tx_context::sender(ctx),
        vote_yes
    });
}

// === View Functions ===

public fun vote_proof_url(self: &VoteProofNFT): Url {
    self.url
}

public fun is_active(self: &Proposal): bool {
    let status = self.status();

    match (status) {
        ProposalStatus::Active => true,
        _ => false,
    }
}

public fun status(self: &Proposal): &ProposalStatus {
    &self.status
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

public fun voters(self: &Proposal): &Table<address, bool> {
    &self.voters
}

public fun is_private(self: &Proposal): bool {
    self.is_private
}

// === Admin Functions ===

public fun create(
    _admin_cap: &AdminCap,
    title: String,
    description: String,
    expiration: u64,
    is_private: bool,
    ctx: &mut TxContext
): ID {
    let proposal = Proposal {
        id: object::new(ctx),
        title,
        description,
        voted_yes_count: 0,
        voted_no_count: 0,
        expiration,
        creator: tx_context::sender(ctx),
        status: ProposalStatus::Active,
        voters: table::new(ctx),
        is_private,
    };

    let id = object::uid_to_inner(&proposal.id);
    transfer::share_object(proposal);
    // Registry creation is now handled in dashboard::register_proposal
    id
}

/// Change the expiration date of a proposal (SuperAdmin only)
public fun change_expiration_date(
    self: &mut Proposal,
    _super_admin_cap: &SuperAdminCap,
    new_expiration: u64
) {
    self.expiration = new_expiration;
}

/// Create a new proposal using SuperAdminCap
public fun create_super(
    _super_admin_cap: &SuperAdminCap,
    title: String,
    description: String,
    expiration: u64,
    is_private: bool,
    ctx: &mut TxContext
): ID {
    let proposal = Proposal {
        id: object::new(ctx),
        title,
        description,
        voted_yes_count: 0,
        voted_no_count: 0,
        expiration,
        creator: tx_context::sender(ctx),
        status: ProposalStatus::Active,
        voters: table::new(ctx),
        is_private,
    };

    let id = object::uid_to_inner(&proposal.id);
    transfer::share_object(proposal);
    // Registry creation is now handled in dashboard::register_proposal_super
    id
}

public fun remove(self: Proposal, _admin_cap: &AdminCap) {
    let Proposal { id, title: _, description: _, voted_yes_count: _, voted_no_count: _, expiration: _, status: _, creator: _, voters, is_private: _ } = self;
    table::drop(voters);
    object::delete(id);
}

public fun remove_super(self: Proposal, _super_admin_cap: &SuperAdminCap) {
    let Proposal { id, title: _, description: _, voted_yes_count: _, voted_no_count: _, expiration: _, status: _, creator: _, voters, is_private: _ } = self;
    table::drop(voters);
    object::delete(id);
}

public fun set_active_status(self: &mut Proposal, admin_cap: &AdminCap) {
    change_status(self, admin_cap, ProposalStatus::Active);
}

public fun set_active_status_super(self: &mut Proposal, super_admin_cap: &SuperAdminCap) {
    change_status_super(self, super_admin_cap, ProposalStatus::Active);
}

public fun set_delisted_status(self: &mut Proposal, admin_cap: &AdminCap) {
    change_status(self, admin_cap, ProposalStatus::Delisted);
}

public fun set_delisted_status_super(self: &mut Proposal, super_admin_cap: &SuperAdminCap) {
    change_status_super(self, super_admin_cap, ProposalStatus::Delisted);
}

fun change_status(
    self: &mut Proposal,
    _admin_cap: &AdminCap,
    new_status: ProposalStatus
) {
    self.status = new_status;
}

fun change_status_super(
    self: &mut Proposal,
    _super_admin_cap: &SuperAdminCap,
    new_status: ProposalStatus
) {
    self.status = new_status;
}

fun issue_vote_proof(proposal: &Proposal, vote_yes: bool, ctx: &mut TxContext) {
    let mut name = b"NFT ".to_string();
    name.append(proposal.title);

    let mut description = b"Proof of voting on ".to_string();
    let proposal_address = object::id_address(proposal).to_string();
    description.append(proposal_address);

    let vote_yes_image = new_unsafe_from_bytes(b"https://lionprado.sirv.com/vote_yes_nft.png");
    let vote_no_image = new_unsafe_from_bytes(b"https://lionprado.sirv.com/vote_no_nft.jpeg");

    let url = if (vote_yes) { vote_yes_image } else { vote_no_image };

    let proof = VoteProofNFT {
        id: object::new(ctx),
        proposal_id: object::uid_to_inner(&proposal.id),
        name,
        description,
        url
    };

    transfer::transfer(proof, tx_context::sender(ctx));
}

}