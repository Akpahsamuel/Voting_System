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
    packageId: "0x1d7b3e004fdf9c437266904b01560da81176e92ddc631e8de1c4aa58caa222b1",
    adminCapId: "0x16c0dd1ab9ab4b033347ba0b58df922b08dfe6a01c1db4e15c696450324d61e9",
    dashboardId: "0x405b6294e544c23604c7711c514ad2faa3ff194e3e77613e45d6ba1ee630675e",
    numProposals: 8, // Specify the number of proposals to generate
  };
  
  // Generate the command
  const ptbCommand = generatePTBCommand(inputs);
  console.log(ptbCommand);