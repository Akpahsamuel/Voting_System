#[allow(unused_variable, unused_const, unused_mut_parameter)]

module voting_system::ballot {
    use std::string::String;
    use sui::table::{Self, Table};
    use sui::url::{Url, new_unsafe_from_bytes};
    use sui::clock::{Clock};
    use sui::event;
    use voting_system::dashboard::{Self, AdminCap, SuperAdminCap, Dashboard};

    // Error codes
    const EDuplicateVote: u64 = 0;
    const EBallotDelisted: u64 = 1;
    const EBallotExpired: u64 = 2;
    const ECandidateNotFound: u64 = 3;
    const ECandidateAlreadyExists: u64 = 4;
    const ENotRegisteredVoter: u64 = 5;
    const EMaxCandidatesReached: u64 = 6;
    const ENotSuperAdmin: u64 = 7;

    // Maximum number of candidates per ballot
    const MAX_CANDIDATES: u64 = 20;

    // ======== Types ========

    public enum BallotStatus has store, drop, copy {
        Active,
        Delisted,
        Expired,
    }

    // Struct to hold candidate information
    public struct Candidate has store, drop, copy {
        id: u64,
        name: String,
        description: String,
        vote_count: u64,
        image_url: Option<String> // Optional image URL for candidate
    }

    // Main Ballot struct
    public struct Ballot has key {
        id: UID,
        title: String,
        description: String,
        candidates: vector<Candidate>,
        candidate_count: u64,
        total_votes: u64,
        expiration: u64,
        creator: address,
        status: BallotStatus,
        voters: Table<address, u64>, // maps voter address to candidate_id they voted for
        is_private: bool,
    }

    // NFT for ballot vote proof
    public struct BallotVoteProof has key {
        id: UID,
        ballot_id: ID,
        candidate_id: u64,
        name: String,
        description: String,
        url: Url,
    }

    // Event emitted when a vote is cast
    public struct BallotVoteRegistered has copy, drop {
        ballot_id: ID,
        voter: address,
        candidate_id: u64,
    }

    // Event emitted when a candidate is added
    public struct CandidateAdded has copy, drop {
        ballot_id: ID,
        candidate_id: u64,
        name: String,
    }

    // Event emitted when a candidate is removed
    public struct CandidateRemoved has copy, drop {
        ballot_id: ID,
        candidate_id: u64,
        removed_by: address,
    }

    // ======== Public Functions ========

    /// Check if a ballot is expired based on current time
    public fun is_expired(self: &Ballot, clock: &Clock): bool {
        self.expiration <= clock.timestamp_ms()
    }

    /// Update ballot status based on expiration time
    public fun update_status_based_on_time(self: &mut Ballot, clock: &Clock) {
        // Only update status if it's currently Active and has expired
        if (self.is_active() && is_expired(self, clock)) {
            self.status = BallotStatus::Expired;
        }
    }

    /// Cast a vote for a specific candidate on the ballot
    public fun vote_for_candidate(
        self: &mut Ballot,
        dashboard: &Dashboard,
        candidate_id: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Update status based on current time before checking
        update_status_based_on_time(self, clock);
        
        // Check ballot validity
        assert!(!is_expired(self, clock), EBallotExpired);
        assert!(self.is_active(), EBallotDelisted);
        assert!(!self.voters.contains(tx_context::sender(ctx)), EDuplicateVote);
        
        // Find candidate in the list
        let mut found = false;
        let mut i = 0;
        let candidates_len = vector::length(&self.candidates);
        
        // Check if candidate exists
        while (i < candidates_len) {
            let candidate = vector::borrow(&self.candidates, i);
            if (candidate.id == candidate_id) {
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, ECandidateNotFound);

        // Check registration for private ballots
        if (self.is_private) {
            let ballot_id = object::uid_to_inner(&self.id);
            // Check if this voter is registered for this ballot
            assert!(dashboard::is_voter_registered_for_proposal(dashboard, ballot_id, tx_context::sender(ctx)), 
                  ENotRegisteredVoter);
        };

        // Update vote count for the candidate
        let  candidate = vector::borrow_mut(&mut self.candidates, i);
        candidate.vote_count = candidate.vote_count + 1;
        
        // Record the vote
        self.voters.add(tx_context::sender(ctx), candidate_id);
        self.total_votes = self.total_votes + 1;
        
        // Issue vote proof NFT
        issue_vote_proof(self, candidate_id, ctx);

        // Emit vote event
        event::emit(BallotVoteRegistered {
            ballot_id: object::uid_to_inner(&self.id),
            voter: tx_context::sender(ctx),
            candidate_id
        });
    }

  
    /// Get a specific candidate's vote count
    public fun get_candidate_votes(self: &Ballot, candidate_id: u64): u64 {
        let mut i = 0;
        let candidates_len = vector::length(&self.candidates);
        
        while (i < candidates_len) {
            let candidate = vector::borrow(&self.candidates, i);
            if (candidate.id == candidate_id) {
                return candidate.vote_count
            };
            i = i + 1;
        };
        
        0 // Return 0 if candidate not found
    }

    /// Get a candidate by ID
    public fun get_candidate(self: &Ballot, candidate_id: u64): (String, String, u64, Option<String>) {
        let mut i = 0;
        let candidates_len = vector::length(&self.candidates);
        
        while (i < candidates_len) {
            let candidate = vector::borrow(&self.candidates, i);
            if (candidate.id == candidate_id) {
                return (candidate.name, candidate.description, candidate.vote_count, candidate.image_url)
            };
            i = i + 1;
        };
        
        (b"Not Found".to_string(), b"Candidate does not exist".to_string(), 0, option::none())
    }

    // ======== Admin Functions ========

    /// Create a new ballot (requires AdminCap)
    public fun create_ballot(
        _admin_cap: &AdminCap,
        title: String,
        description: String,
        expiration: u64,
        is_private: bool,
        ctx: &mut TxContext
    ): ID {
        let ballot = Ballot {
            id: object::new(ctx),
            title,
            description,
            candidates: vector::empty(),
            candidate_count: 0,
            total_votes: 0,
            expiration,
            creator: tx_context::sender(ctx),
            status: BallotStatus::Active,
            voters: table::new(ctx),
            is_private,
        };

        let id = object::uid_to_inner(&ballot.id);
        transfer::share_object(ballot);
        id
    }

    /// Create a new ballot using SuperAdminCap
    public fun create_ballot_super(
        _super_admin_cap: &SuperAdminCap,
        title: String,
        description: String,
        expiration: u64,
        is_private: bool,
        ctx: &mut TxContext
    ): ID {
        let ballot = Ballot {
            id: object::new(ctx),
            title,
            description,
            candidates: vector::empty(),
            candidate_count: 0,
            total_votes: 0,
            expiration,
            creator: tx_context::sender(ctx),
            status: BallotStatus::Active,
            voters: table::new(ctx),
            is_private,
        };

        let id = object::uid_to_inner(&ballot.id);
        transfer::share_object(ballot);
        id
    }

    /// Internal function to add a candidate to the ballot
    /// This is a helper function used by the public add_candidate functions
    fun add_candidate_internal(
        self: &mut Ballot,
        name: String,
        description: String,
        image_url: Option<String>,
        ctx: &mut TxContext
    ) {
        // Check if we've reached the maximum number of candidates
        assert!(self.candidate_count < MAX_CANDIDATES, EMaxCandidatesReached);
        
        // Create a new candidate ID (incremental)
        let candidate_id = self.candidate_count + 1;
        
        // Create and add the candidate
        let candidate = Candidate {
            id: candidate_id,
            name,
            description,
            vote_count: 0,
            image_url
        };
        
        vector::push_back(&mut self.candidates, candidate);
        self.candidate_count = candidate_id;
        
        // Emit event
        event::emit(CandidateAdded {
            ballot_id: object::uid_to_inner(&self.id),
            candidate_id,
            name
        });
    }

    // Add a candidate to the ballot (Admin version)
    // public fun add_candidate(
    //     self: &mut Ballot,
    //     _admin_cap: &AdminCap,
    //     name: String,
    //     description: String,
    //     ctx: &mut TxContext
    // ) {
    //     add_candidate_internal(self, name, description, option::none(), ctx);
    // }

    // Add a candidate to the ballot (SuperAdmin version)
    // public fun add_candidate_super(
    //     self: &mut Ballot,
    //     _super_admin_cap: &SuperAdminCap,
    //     name: String,
    //     description: String,
    //     ctx: &mut TxContext
    // ) {
    //     add_candidate_internal(self, name, description, option::none(), ctx);
    // }

    /// Add a candidate to the ballot
    public fun add_candidate(
        self: &mut Ballot,
        _admin_cap: &AdminCap,
        name: String,
        description: String,
        ctx: &mut TxContext
    ) {
        add_candidate_internal(self, name, description, option::none(), ctx);
    }

    /// Add a candidate to the ballot with an image URL
    public fun add_candidate_with_image(
        self: &mut Ballot,
        _admin_cap: &AdminCap,
        name: String,
        description: String,
        image_url: String,
        ctx: &mut TxContext
    ) {
        add_candidate_internal(self, name, description, option::some(image_url), ctx);
    }

    /// Add a candidate to the ballot using SuperAdminCap
    public fun add_candidate_super(
        self: &mut Ballot,
        _super_admin_cap: &SuperAdminCap,
        name: String,
        description: String,
        ctx: &mut TxContext
    ) {
        add_candidate_internal(self, name, description, option::none(), ctx);
    }

    /// Add a candidate to the ballot with an image URL using SuperAdminCap
    public fun add_candidate_with_image_super(
        self: &mut Ballot,
        _super_admin_cap: &SuperAdminCap,
        name: String,
        description: String,
        image_url: String,
        ctx: &mut TxContext
    ) {
        add_candidate_internal(self, name, description, option::some(image_url), ctx);
    }

    /// Remove a candidate from a ballot (Admin version)
    public fun remove_candidate(
        self: &mut Ballot,
        _admin_cap: &AdminCap,
        candidate_id: u64,
        ctx: &mut TxContext
    ) {
        // Verify the candidate exists
        let mut found = false;
        let mut index_to_remove = 0;
        let candidates_len = vector::length(&self.candidates);
        
        // Find the candidate index
        let mut i = 0;
        while (i < candidates_len) {
            let candidate = vector::borrow(&self.candidates, i);
            if (candidate.id == candidate_id) {
                found = true;
                index_to_remove = i;
                break
            };
            i = i + 1;
        };
        
        // If candidate not found, abort
        assert!(found, ECandidateNotFound);
        
        // Remove the candidate from the vector
        // Note: This doesn't change existing candidate IDs
        vector::remove(&mut self.candidates, index_to_remove);
        
        // Emit an event for candidate removal
        event::emit(CandidateRemoved {
            ballot_id: object::uid_to_inner(&self.id),
            candidate_id,
            removed_by: tx_context::sender(ctx)
        });
    }
    
    /// Remove a candidate from a ballot (SuperAdmin version)
    public fun remove_candidate_super(
        self: &mut Ballot,
        _super_admin_cap: &SuperAdminCap,
        candidate_id: u64,
        ctx: &mut TxContext
    ) {
        // Verify the candidate exists
        let mut found = false;
        let mut index_to_remove = 0;
        let candidates_len = vector::length(&self.candidates);
        
        // Find the candidate index
        let mut i = 0;
        while (i < candidates_len) {
            let candidate = vector::borrow(&self.candidates, i);
            if (candidate.id == candidate_id) {
                found = true;
                index_to_remove = i;
                break
            };
            i = i + 1;
        };
        
        // If candidate not found, abort
        assert!(found, ECandidateNotFound);
        
        // Remove the candidate from the vector
        // Note: This doesn't change existing candidate IDs
        vector::remove(&mut self.candidates, index_to_remove);
        
        // Emit an event for candidate removal
        event::emit(CandidateRemoved {
            ballot_id: object::uid_to_inner(&self.id),
            candidate_id,
            removed_by: tx_context::sender(ctx)
        });
    }

    /// Change the expiration date of a ballot (SuperAdmin only)
    public fun change_expiration_date(
        self: &mut Ballot,
        _super_admin_cap: &SuperAdminCap,
        new_expiration: u64
    ) {
        self.expiration = new_expiration;
    }

    /// Public entry function to check and update a ballot's status based on current time
    /// This can be called by anyone to ensure ballot status is up-to-date
    public entry fun check_and_update_ballot_status(self: &mut Ballot, clock: &Clock) {
        update_status_based_on_time(self, clock);
    }

    /// Remove a ballot (SuperAdmin only)
    public fun remove_ballot(self: Ballot, _super_admin_cap: &SuperAdminCap) {
        let Ballot { 
            id, 
            title: _, 
            description: _, 
            candidates: _, 
            candidate_count: _,
            total_votes: _,
            expiration: _, 
            creator: _, 
            status: _, 
            voters, 
            is_private: _ 
        } = self;
        
        table::drop(voters);
        object::delete(id);
    }

    /// Set ballot to active status (requires AdminCap)
    public fun set_ballot_active_status(self: &mut Ballot, _admin_cap: &AdminCap) {
        self.status = BallotStatus::Active;
    }

    /// Set ballot to active status (requires SuperAdminCap)
    public fun set_ballot_active_status_super(self: &mut Ballot, _super_admin_cap: &SuperAdminCap) {
        self.status = BallotStatus::Active;
    }

    /// Set ballot to delisted status (requires AdminCap)
    public fun set_ballot_delisted_status(self: &mut Ballot, _admin_cap: &AdminCap) {
        self.status = BallotStatus::Delisted;
    }

    /// Set ballot to delisted status (requires SuperAdminCap)
    public fun set_ballot_delisted_status_super(self: &mut Ballot, _super_admin_cap: &SuperAdminCap) {
        self.status = BallotStatus::Delisted;
    }

    // ======== Private Functions ========

    /// Issue a vote proof NFT to the voter
    fun issue_vote_proof(ballot: &Ballot, candidate_id: u64, ctx: &mut TxContext) {
        // Find the candidate name
        let mut candidate_name = b"Unknown".to_string();
        let mut i = 0;
        let candidates_len = vector::length(&ballot.candidates);
        
        while (i < candidates_len) {
            let candidate = vector::borrow(&ballot.candidates, i);
            if (candidate.id == candidate_id) {
                candidate_name = candidate.name;
                break
            };
            i = i + 1;
        };

        let mut name = b"Ballot Vote: ".to_string();
        name.append(ballot.title);

        let mut description = b"Voted for ".to_string();
        description.append(candidate_name);
        description.append(b" on ballot ".to_string());
        let ballot_address = object::id_address(ballot).to_string();
        description.append(ballot_address);

        // Use a generic voting image for now
        let url = new_unsafe_from_bytes(b"https://lionprado.sirv.com/vote_yes_nft.png");

        let proof = BallotVoteProof {
            id: object::new(ctx),
            ballot_id: object::uid_to_inner(&ballot.id),
            candidate_id,
            name,
            description,
            url
        };

        transfer::transfer(proof, tx_context::sender(ctx));
    }


      // ======== View Functions ========

    /// Get the vote proof URL
    public fun ballot_vote_proof_url(self: &BallotVoteProof): Url {
        self.url
    }

    /// Check if ballot is active
    public fun is_active(self: &Ballot): bool {
        match (self.status) {
            BallotStatus::Active => true,
            _ => false,
        }
    }

    public fun status(self: &Ballot): &BallotStatus {
        &self.status
    }

    public fun title(self: &Ballot): String {
        self.title
    }

    public fun description(self: &Ballot): String {
        self.description
    }

    public fun candidates(self: &Ballot): &vector<Candidate> {
        &self.candidates
    }

    public fun candidate_count(self: &Ballot): u64 {
        self.candidate_count
    }

    public fun total_votes(self: &Ballot): u64 {
        self.total_votes
    }

    public fun expiration(self: &Ballot): u64 {
        self.expiration
    }

    public fun creator(self: &Ballot): address {
        self.creator
    }

    public fun voters(self: &Ballot): &Table<address, u64> {
        &self.voters
    }

    public fun is_private(self: &Ballot): bool {
        self.is_private
    }

}