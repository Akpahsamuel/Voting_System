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
    packageId: "0x03e4c3bf9209dac9b695b6c8653f7a6e24ef4c927d9c6455c94ed7720d26b7f2",
    adminCapId: "0xcb63dc0001886b054e6a4c320489ade258f0d4eee2e37006844ea40af905bd08",
    dashboardId: "0xecdc75053593acd4a4f6b3e6e1a22f8f2c89bc1bbeeac4db19cce10c3544734e",
    numProposals: 3, // Specify the number of proposals to generate
  };
  
  // Generate the command
  const ptbCommand = generatePTBCommand(inputs);
  console.log(ptbCommand);