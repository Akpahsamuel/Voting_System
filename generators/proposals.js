const generatePTBCommand = ({ packageId, adminCapId, dashboardId, numProposals }) => {
    let command = "sui client ptb";
  
    for (let i = 1; i <= numProposals; i++) {
      // Generate timestamp: current date + 1 year + incremental seconds
      const currentDate = new Date();
      const oneYearFromNow = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
      const timestamp = oneYearFromNow.getTime() + i * 1000; // Add 1 second per proposal
      const timestampId = Math.floor(Math.random() * 100000 * i);
  
      const title = `Proposal ${timestampId}`;
      const description = `Proposal description ${timestampId}`;
  
      // Add proposal creation command
      command += ` \\
    --move-call ${packageId}::proposal::create \\
    @${adminCapId} \\
    '"${title}"' '"${description}"' ${timestamp} \\
    --assign proposal_id`;
  
      // Add dashboard registration command
      command += ` \\
    --move-call ${packageId}::dashboard::register_proposal \\
    @${dashboardId} \\
    @${adminCapId} proposal_id`;
    }
  
    return command;
  };
  
  // Inputs
  const inputs = {
    packageId: "0xae5f4779b12586e8f8d7afbe093a400490b6359d09419becc7fe87a21d03eaa9",
    adminCapId: "0xf0e92c36c81c29dce9543150d5646da5444567988b8c32332388a684b681edb8",
    dashboardId: "0x53ba957104d724858504dfd7676dafee24a81c685d4a2d0c2155b8d90cf5cfde",
    numProposals: 3, // Specify the number of proposals to generate
  };
  
  // Generate the command
  const ptbCommand = generatePTBCommand(inputs);
  console.log(ptbCommand);