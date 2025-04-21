import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { useAdminCap } from "../../hooks/useAdminCap";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

// Import shadcn components
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Calendar } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";

// Form schema validation
const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }).max(100, { message: "Title cannot exceed 100 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  expiration: z.date({
    required_error: "Expiration date is required",
  }).refine((date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return date >= tomorrow;
  }, {
    message: "Expiration date must be at least tomorrow",
  }),
});

const CreateProposal = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");
  const { adminCapId } = useAdminCap();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!adminCapId) {
      toast.error("Admin capability not found");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Calculate the expiration timestamp (in milliseconds)
      const expirationMs = values.expiration.getTime();
      
      // Create a new proposal transaction
      const tx = new Transaction();
      const proposalId = tx.moveCall({
        target: `${packageId}::proposal::create`,
        arguments: [
          tx.object(adminCapId),
          tx.pure.string(values.title),
          tx.pure.string(values.description),
          tx.pure.u64(expirationMs)
        ],
      });
      
      // Register the proposal in the dashboard
      tx.moveCall({
        target: `${packageId}::dashboard::register_proposal`,
        arguments: [
          tx.object(dashboardId),
          tx.object(adminCapId),
          proposalId
        ],
      });
      
      await signAndExecute({
        transaction: tx.serialize()
      }, {
        onSuccess: () => {
          toast.success("Proposal created successfully!");
          form.reset();
          setIsLoading(false);
        },
        onError: (error) => {
          toast.error(`Error creating proposal: ${error.message}`);
          setIsLoading(false);
        }
      });
    } catch (error: any) {
      toast.error(`Error: ${error.message || error}`);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Card className="border shadow-md bg-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Create New Proposal</CardTitle>
          <CardDescription>
            Fill out the form below to create a new governance proposal
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposal Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter a clear, concise title" 
                        {...field} 
                        className="w-full" 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Keep your title descriptive but concise
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the proposal in detail" 
                        {...field} 
                        className="min-h-32 resize-y" 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide enough context for voters to make an informed decision
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiration"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiration Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Select expiration date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            return date < tomorrow;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      The proposal will be active until this date
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto ml-auto" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Proposal"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProposal;
